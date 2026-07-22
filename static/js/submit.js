let map;
let selectedMarker = null;
let speciesDataCache = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadSpeciesData();
    wireEvents();
});

function initMap() {
    map = L.map('submit-map').setView([5, 118], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    map.on('click', function (e) {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });
}

function selectLocation(lat, lng) {
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    const icon = L.divIcon({
        className: 'custom-marker',
        html: '<i class="fas fa-map-marker-alt" style="color: #0f84bc; font-size: 24px;"></i>',
        iconSize: [24, 32],
        iconAnchor: [12, 32]
    });

    selectedMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
    checkFormValid();
}

function searchLocation() {
    const query = document.getElementById('location-search').value.trim();
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                map.setView([lat, lng], 10);
                selectLocation(lat, lng);
                document.getElementById('location-name').value = data[0].display_name.split(',').slice(0, 3).join(',');
            } else {
                alert('Location not found. Try a different search term.');
            }
        })
        .catch(error => console.error('Geocoding error:', error));
}

function loadSpeciesData() {
    fetch('static/data/coral_spawning_data.json')
        .then(response => response.json())
        .then(data => {
            const speciesByGenus = {};
            data.forEach(event => {
                const genus = event.genus;
                const species = event.species;
                if (genus && species) {
                    if (!speciesByGenus[genus]) {
                        speciesByGenus[genus] = new Set();
                    }
                    speciesByGenus[genus].add(species);
                }
            });

            speciesDataCache = {};
            Object.keys(speciesByGenus).sort().forEach(genus => {
                speciesDataCache[genus] = Array.from(speciesByGenus[genus]).sort();
            });

            populateGenusSelect();
        })
        .catch(error => console.error('Error loading species data:', error));
}

function populateGenusSelect() {
    const genusSelect = document.getElementById('genus');
    Object.keys(speciesDataCache).forEach(genus => {
        const opt = document.createElement('option');
        opt.value = genus;
        opt.textContent = genus;
        genusSelect.appendChild(opt);
    });
}

function populateSpeciesSelect(genus) {
    const speciesSelect = document.getElementById('species');
    speciesSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = genus ? '-- Select Species --' : '-- Select Genus First --';
    speciesSelect.appendChild(placeholder);

    if (genus && speciesDataCache[genus]) {
        speciesDataCache[genus].forEach(sp => {
            const opt = document.createElement('option');
            opt.value = sp;
            opt.textContent = sp;
            speciesSelect.appendChild(opt);
        });
    }
}

function onGenusChange() {
    const genus = document.getElementById('genus').value;
    populateSpeciesSelect(genus);
    checkFormValid();
}

function wireEvents() {
    document.getElementById('search-btn').onclick = searchLocation;

    document.getElementById('location-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });

    document.getElementById('genus').addEventListener('change', onGenusChange);
    document.getElementById('species').addEventListener('change', checkFormValid);
    document.getElementById('location-name').addEventListener('input', checkFormValid);
    document.getElementById('obs-date').addEventListener('input', checkFormValid);

    document.getElementById('submit-btn').onclick = submitObservation;
}

function checkFormValid() {
    const genus = document.getElementById('genus').value;
    const species = document.getElementById('species').value;
    const location = document.getElementById('location-name').value.trim();
    const date = document.getElementById('obs-date').value;
    const lat = document.getElementById('latitude').value;

    const valid = genus && species && location && date && lat;
    document.getElementById('submit-btn').disabled = !valid;
}

function showAlert(message, type) {
    const container = document.getElementById('alert-container');
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

async function submitObservation() {
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

    const payload = {
        genus: document.getElementById('genus').value,
        species: document.getElementById('species').value,
        location: document.getElementById('location-name').value.trim(),
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        date: document.getElementById('obs-date').value,
        start_time: document.getElementById('start-time').value || '',
        end_time: document.getElementById('end-time').value || '',
        days_after_full_moon: document.getElementById('days-after-fm').value
            ? parseInt(document.getElementById('days-after-fm').value) : null,
        gamete_release: document.getElementById('gamete-release').value,
        situation: document.getElementById('situation').value,
        reference: document.getElementById('reference').value.trim(),
        submitted_by: document.getElementById('submitted-by').value.trim(),
    };

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
            showAlert(
                '<i class="fas fa-check-circle me-2"></i>Observation submitted successfully!',
                'success'
            );
            resetForm();
        } else {
            showAlert(
                `<i class="fas fa-exclamation-triangle me-2"></i>${result.error || 'Submission failed'}`,
                'danger'
            );
        }
    } catch (error) {
        showAlert(
            '<i class="fas fa-exclamation-triangle me-2"></i>Network error. Please try again.',
            'danger'
        );
        console.error('Submit error:', error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Observation';
        checkFormValid();
    }
}

function resetForm() {
    document.getElementById('genus').value = '';
    populateSpeciesSelect('');
    document.getElementById('location-name').value = '';
    document.getElementById('obs-date').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('end-time').value = '';
    document.getElementById('days-after-fm').value = '';
    document.getElementById('gamete-release').value = '';
    document.getElementById('situation').value = 'In situ';
    document.getElementById('reference').value = '';
    document.getElementById('submitted-by').value = '';
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
        selectedMarker = null;
    }

    checkFormValid();
}
