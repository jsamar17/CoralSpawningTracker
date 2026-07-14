# Coral Spawning Database Search

## Overview

This is a Flask-based web application that functions as a specialized search engine for coral spawning events. The application provides a dual-panel interface where users can search for coral spawning events by location using an interactive map and apply various filters to refine their results. The system is designed to help researchers, marine biologists, and coral enthusiasts find specific spawning events based on geographic location and temporal patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: HTML5, CSS3, JavaScript, Bootstrap 5.3, Leaflet.js for mapping
- **UI Pattern**: Split-panel design with a control panel (35% width) and results dashboard (65% width)
- **Responsive Design**: Dark theme with professional styling using CSS custom properties
- **Interactive Components**: 
  - Leaflet-based interactive map with location selection
  - Distance slider for radius-based searching
  - Filter dropdowns for refining results
  - Scrollable results cards display

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Structure**: Simple modular design with separate route handling
- **Session Management**: Flask sessions with configurable secret key
- **Logging**: Built-in Python logging with DEBUG level for development

### Data Storage Solutions
- **Current Implementation**: JSON flat files for optimized performance
  - `coral_spawning_data.json`: Contains 6,178 spawning event records with location, timing, and species data
  - `coral_species.json`: Contains 61 coral species metadata and descriptions
- **Data Schema**: Each spawning event includes coordinates, dates, species information, and research references
- **Performance**: JSON-based storage provides faster search and filtering for the current dataset size

## Key Components

### Map Integration
- **Library**: Leaflet.js with CartoDB dark theme tiles
- **Functionality**: Click-to-select location, search by place name, geolocation API integration
- **Distance Calculation**: Uses geopy library for geodesic distance calculations

### Filtering System
- **Multi-dimensional Filters**: Year, month, days after full moon, species/genera
- **Real-time Updates**: Dynamic filtering without page reloads
- **API Endpoints**: RESTful filtering through `/api/filter` endpoint

### Data Processing
- **Geospatial Queries**: Calculates distances between user-selected locations and spawning sites
- **Temporal Analysis**: Correlates spawning dates with lunar cycles (full moon calculations)
- **Species Management**: Dynamic species dropdown population based on search results

## Data Flow

1. **User Interaction**: User selects location on map or searches by place name
2. **Location Processing**: Frontend captures coordinates and updates map marker
3. **Search Execution**: System queries JSON data for events within specified radius
4. **Distance Calculation**: Backend calculates geodesic distances using geopy
5. **Results Rendering**: Matching events displayed as cards with species images and details
6. **Filter Application**: Users can refine results using dropdown filters
7. **Export Functionality**: Filtered results can be exported (feature planned)

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3**: UI components and responsive grid system
- **Leaflet 1.9.4**: Interactive mapping functionality
- **Font Awesome 6.4**: Icon library for UI elements
- **CartoDB**: Map tile provider with dark theme

### Backend Libraries
- **Flask**: Web application framework
- **geopy**: Geospatial distance calculations
- **datetime**: Date and time processing for lunar cycle calculations

### APIs and Services
- **Geolocation API**: Browser-based location detection
- **Unsplash**: Placeholder images for coral species (via URLs in JSON data)

## Deployment Strategy

### Development Environment
- **Host Configuration**: Runs on `0.0.0.0:5000` for local development
- **Debug Mode**: Enabled for development with detailed error reporting
- **Session Security**: Uses environment variable for session secret with fallback

### Production Considerations
- **Environment Variables**: `SESSION_SECRET` for secure session management
- **Logging**: Configurable logging levels for production deployment
- **Static Assets**: Served through Flask's static file handling
- **Database Migration Path**: Prepared for future PostgreSQL integration with Drizzle ORM

### File Structure
```
├── app.py                 # Flask application initialization
├── main.py               # Alternative entry point
├── routes.py             # Route handlers and business logic
├── data/                 # JSON data files
├── templates/            # Jinja2 HTML templates
└── static/              # CSS, JavaScript, and assets
    ├── css/
    └── js/
```

The application follows Flask best practices with modular route separation and proper static file organization. The architecture supports easy scaling and database migration when needed.