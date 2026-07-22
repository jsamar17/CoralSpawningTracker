import json
import logging
from datetime import datetime

from flask import jsonify, request, render_template
from geopy.distance import geodesic

from app import app

# Configure logging
logging.basicConfig(level=logging.DEBUG)

DEFAULT_IMAGE_URL = (
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7'
    '?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA'
    '%3D%3D&auto=format&fit=crop&w=1000&q=80'
)


def load_coral_data():
    """Load coral spawning and species data from JSON files."""
    try:
        with open('data/coral_spawning_data.json', 'r') as f:
            spawning_data = json.load(f)
        with open('data/coral_species.json', 'r') as f:
            species_data = json.load(f)
        return spawning_data, species_data
    except FileNotFoundError as e:
        logging.error(f"Data file not found: {e}")
        return [], {}


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate geodesic distance between two points in km."""
    try:
        return geodesic((lat1, lon1), (lat2, lon2)).kilometers
    except Exception as e:
        logging.error(f"Error calculating distance: {e}")
        return float('inf')


def calculate_days_after_full_moon(spawn_date, full_moon_dates):
    """Calculate days after full moon for a given spawn date."""
    try:
        spawn_dt = datetime.strptime(spawn_date, '%Y-%m-%d')

        closest_full_moon = None
        min_diff = float('inf')

        for fm_date_str in full_moon_dates:
            fm_date = datetime.strptime(fm_date_str, '%Y-%m-%d')
            if fm_date <= spawn_dt:
                diff = (spawn_dt - fm_date).days
                if diff < min_diff:
                    min_diff = diff
                    closest_full_moon = fm_date

        if closest_full_moon:
            return (spawn_dt - closest_full_moon).days
        return None
    except Exception as e:
        logging.error(f"Error calculating days after full moon: {e}")
        return None


@app.route('/api/search', methods=['POST'])
def search_spawning_events():
    """Search spawning events by location and radius."""
    try:
        data = request.get_json()
        lat = float(data.get('lat', 0))
        lon = float(data.get('lon', 0))
        radius = float(data.get('radius', 50))

        spawning_data, species_data = load_coral_data()

        filtered_events = []
        for event in spawning_data:
            event_lat = float(event.get('latitude', 0))
            event_lon = float(event.get('longitude', 0))

            distance = calculate_distance(lat, lon, event_lat, event_lon)
            if distance <= radius:
                event['distance'] = round(distance, 2)

                genus = event.get('genus', 'Unknown')
                if genus in species_data and 'image_url' in species_data[genus]:
                    event['image_url'] = species_data[genus]['image_url']
                else:
                    event['image_url'] = DEFAULT_IMAGE_URL

                filtered_events.append(event)

        filtered_events.sort(key=lambda x: x.get('distance', 0))

        return jsonify({
            'success': True,
            'events': filtered_events,
            'count': len(filtered_events)
        })

    except Exception as e:
        logging.error(f"Search error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'events': [],
            'count': 0
        })


@app.route('/api/filter', methods=['POST'])
def filter_events():
    """Filter events by year, month, days after full moon, and species."""
    try:
        data = request.get_json()
        events = data.get('events', [])
        filters = data.get('filters', {})

        filtered_events = []

        for event in events:
            if filters.get('year') and filters['year'] != 'all':
                event_year = int(event.get('date', '2000-01-01').split('-')[0])
                current_year = datetime.now().year

                if filters['year'] == 'last_5':
                    if event_year < current_year - 5:
                        continue
                elif filters['year'] == 'last_10':
                    if event_year < current_year - 10:
                        continue
                elif filters['year'].isdigit():
                    if event_year != int(filters['year']):
                        continue

            if filters.get('month') and filters['month'] != 'all':
                event_month = int(event.get('date', '2000-01-01').split('-')[1])
                if event_month != int(filters['month']):
                    continue

            if filters.get('days_after_fm') and filters['days_after_fm'] != 'all':
                event_days = event.get('days_after_full_moon')
                if event_days is None:
                    continue

                filter_days = int(filters['days_after_fm'])
                if abs(event_days - filter_days) > 1:
                    continue

            if filters.get('species') and filters['species'] != 'all':
                event_genus = event.get('genus', '').lower()
                if event_genus != filters['species'].lower():
                    continue

            filtered_events.append(event)

        return jsonify({
            'success': True,
            'events': filtered_events,
            'count': len(filtered_events)
        })

    except Exception as e:
        logging.error(f"Filter error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'events': [],
            'count': 0
        })


@app.route('/api/export', methods=['POST'])
def export_results():
    """Export filtered results as CSV."""
    try:
        data = request.get_json()
        events = data.get('events', [])

        csv_content = (
            "Date,Genus,Species,Location,Latitude,Longitude,"
            "Start_Time,End_Time,Days_After_Full_Moon,Reference\n"
        )

        for event in events:
            def escape_csv_field(field):
                field_str = str(field) if field is not None else ''
                if ',' in field_str or '"' in field_str or '\n' in field_str:
                    return f'"{field_str.replace(chr(34), chr(34)+chr(34))}"'
                return field_str

            row = ",".join([
                escape_csv_field(event.get('date', '')),
                escape_csv_field(event.get('genus', '')),
                escape_csv_field(event.get('species', '')),
                escape_csv_field(event.get('location', '')),
                escape_csv_field(event.get('latitude', '')),
                escape_csv_field(event.get('longitude', '')),
                escape_csv_field(event.get('start_time', '')),
                escape_csv_field(event.get('end_time', '')),
                escape_csv_field(event.get('days_after_full_moon', '')),
                escape_csv_field(event.get('reference', '')),
            ])
            csv_content += row + "\n"

        return jsonify({
            'success': True,
            'csv_content': csv_content,
            'filename': f"coral_spawning_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        })

    except Exception as e:
        logging.error(f"Export error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })
