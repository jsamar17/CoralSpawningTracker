// Coral Spawning Database Search Application
// Global variables
let map;
let currentMarker;
let allEvents = [];
let currentEvents = [];

// Coral spawning data - REPLACE THIS SECTION WITH YOUR COMPLETE DATASET
const CORAL_SPAWNING_DATA = [
  {
    "id": 1,
    "genus": "Porites",
    "species": "cylindrica",
    "location": "Faga'alu, American Samoa",
    "latitude": -14.279444444444445,
    "longitude": -170.70083333333332,
    "date": "1988-10-27",
    "start_time": "20:30",
    "end_time": "",
    "days_after_full_moon": 3,
    "gamete_release": "Sperm",
    "situation": "In situ",
    "timezone": "-11.0",
    "reference": "Itano & Buckley 1988",
    "image_url": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=300"
  }
  // IMPORTANT: Replace this sample data with your complete dataset
  // Your data should include all 6,178+ spawning events
];

// Coral species data - REPLACE THIS SECTION WITH YOUR COMPLETE GENUS DATA
const CORAL_SPECIES_DATA = {
  "Porites": {
    "description": "Massive boulder corals, long-lived species",
    "common_name": "Boulder Coral",
    "spawning_pattern": "Annual synchronous spawning, extended season",
    "image_url": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
  }
  // IMPORTANT: Replace this with your complete genus data
  // Your data should include all 61 coral genera with their specific images
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initEventListeners();
    initDistanceSlider();
});

// Initialize map
function initMap() {
    // Create map centered on the Great Barrier Reef
    map = L.map('map').setView([-18.2871, 147.6992], 6);
    
    // Add tile layer with colorful minimal theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Add click event to map
    map.on('click', function(e) {
        setLocationMarker(e.latlng.lat, e.latlng.lng);
        window.selectedLocation = e.latlng;
    });
}

// Set location marker on map
function setLocationMarker(lat, lng) {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #ec2547; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
}

// Initialize event listeners
function initEventListeners() {
    // Distance slider
    const distanceSlider = document.getElementById('distance-slider');
    const distanceValue = document.getElementById('distance-value');
    
    distanceSlider.addEventListener('input', function() {
        distanceValue.textContent = this.value;
    });
    
    // Search button
    document.getElementById('search-events-btn').addEventListener('click', searchSpawningEvents);
    
    // Location search
    document.getElementById('search-btn').addEventListener('click', searchLocation);
    document.getElementById('location-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
    
    // Use my location
    document.getElementById('locate-me-btn').addEventListener('click', useMyLocation);
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportResults);
    
    // Filter event listeners
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const daysFilter = document.getElementById('days-filter');
    const speciesFilter = document.getElementById('species-filter');
    
    [yearFilter, monthFilter, daysFilter, speciesFilter].forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });
}

// Initialize distance slider
function initDistanceSlider() {
    const slider = document.getElementById('distance-slider');
    const value = document.getElementById('distance-value');
    
    slider.addEventListener('input', function() {
        value.textContent = this.value;
    });
}

// Search for location using geocoding
async function searchLocation() {
    const query = document.getElementById('location-search').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const results = await response.json();
        
        if (results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            map.setView([lat, lng], 10);
            setLocationMarker(lat, lng);
            window.selectedLocation = { lat, lng };
        } else {
            alert('Location not found. Please try a different search term.');
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        alert('Error searching for location. Please try again.');
    }
}

// Use geolocation API
function useMyLocation() {
    const btn = document.getElementById('locate-me-btn');
    
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Locating...';
    btn.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            map.setView([lat, lng], 10);
            setLocationMarker(lat, lng);
            window.selectedLocation = { lat, lng };
            
            btn.innerHTML = '<i class="fas fa-crosshairs me-2"></i>Use My Location';
            btn.disabled = false;
        },
        (error) => {
            alert('Error getting your location: ' + error.message);
            btn.innerHTML = '<i class="fas fa-crosshairs me-2"></i>Use My Location';
            btn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Search for spawning events
function searchSpawningEvents() {
    if (!window.selectedLocation) {
        alert('Please select a location first.');
        return;
    }
    
    const radius = document.getElementById('distance-slider').value;
    const loadingIndicator = document.getElementById('loading-indicator');
    const searchBtn = document.getElementById('search-events-btn');
    
    // Show loading state
    loadingIndicator.classList.remove('d-none');
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
    
    // Simulate API call with local data
    setTimeout(() => {
        const filteredEvents = [];
        
        CORAL_SPAWNING_DATA.forEach(event => {
            const distance = calculateDistance(
                window.selectedLocation.lat, 
                window.selectedLocation.lng, 
                event.latitude, 
                event.longitude
            );
            
            if (distance <= radius) {
                // Add genus-specific image URL
                const genus = event.genus || 'Unknown';
                if (CORAL_SPECIES_DATA[genus] && CORAL_SPECIES_DATA[genus].image_url) {
                    event.image_url = CORAL_SPECIES_DATA[genus].image_url;
                } else {
                    event.image_url = 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
                }
                
                event.distance = Math.round(distance * 100) / 100;
                filteredEvents.push(event);
            }
        });
        
        // Sort by distance
        filteredEvents.sort((a, b) => a.distance - b.distance);
        
        allEvents = filteredEvents;
        currentEvents = [...allEvents];
        updateResultsDisplay();
        populateSpeciesFilter();
        showFiltersSection();
        updateSearchSummary(currentEvents);
        
        // Hide loading state
        loadingIndicator.classList.add('d-none');
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search Spawning Events';
    }, 1000);
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update results display
function updateResultsDisplay() {
    const resultsCount = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    const eventsGrid = document.getElementById('events-grid');
    const exportBtn = document.getElementById('export-btn');
    
    resultsCount.textContent = currentEvents.length;
    
    if (currentEvents.length === 0) {
        emptyState.style.display = 'flex';
        eventsGrid.style.display = 'none';
        exportBtn.disabled = true;
        
        // Update empty state message
        const emptyContent = emptyState.querySelector('.empty-state-content');
        emptyContent.innerHTML = `
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <h4 class="text-muted">No Events Found</h4>
            <p class="text-muted">No coral spawning events were found in the selected area. Try expanding your search radius or selecting a different location.</p>
        `;
    } else {
        emptyState.style.display = 'none';
        eventsGrid.style.display = 'grid';
        exportBtn.disabled = false;
        
        // Render event cards
        renderEventCards();
    }
}

// Render event cards
function renderEventCards() {
    const eventsGrid = document.getElementById('events-grid');
    eventsGrid.innerHTML = '';
    
    currentEvents.forEach(event => {
        const card = createEventCard(event);
        eventsGrid.appendChild(card);
    });
}

// Create event card element
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card fade-in';
    card.onclick = () => showEventDetails(event);
    
    const date = new Date(event.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <img src="${event.image_url}" alt="${event.genus} ${event.species}" class="event-card-image" 
             onerror="this.src='https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=300'">
        <div class="event-card-content">
            <h6 class="event-card-title">${event.genus} ${event.species}</h6>
            <p class="event-card-subtitle">${event.location}</p>
            <div class="event-card-info">
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${event.start_time} - ${event.end_time || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-moon"></i>
                    <span>${event.days_after_full_moon} days after FM</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-flask"></i>
                    <span>${event.gamete_release}</span>
                </div>
            </div>
        </div>
        <div class="event-card-footer">
            <span class="distance-badge">${event.distance} km away</span>
            <span class="reference-text">  ${event.reference}</span>
        </div>
    `;
    
    return card;
}

// Show event details in modal
function showEventDetails(event) {
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    const modalBody = document.getElementById('eventModalBody');
    const modalTitle = document.getElementById('eventModalLabel');
    
    modalTitle.textContent = `${event.genus} ${event.species} - Spawning Event`;
    
    const date = new Date(event.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <img src="${event.image_url}" alt="${event.genus} ${event.species}" 
                     class="img-fluid rounded mb-3" style="max-height: 300px; object-fit: cover;">
            </div>
            <div class="col-md-6">
                <h5 class="mb-3">${event.genus} ${event.species}</h5>
                <div class="event-details">
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${event.start_time} - ${event.end_time || 'N/A'}</p>
                    <p><strong>Days After Full Moon:</strong> ${event.days_after_full_moon}</p>
                    <p><strong>Gamete Release:</strong> ${event.gamete_release}</p>
                    <p><strong>Situation:</strong> ${event.situation}</p>
                    <p><strong>Distance:</strong> ${event.distance} km away</p>
                    <p><strong>Reference:</strong> ${event.reference}</p>
                </div>
            </div>
        </div>
    `;
    
    modal.show();
}

// Populate species filter dropdown
function populateSpeciesFilter() {
    const speciesFilter = document.getElementById('species-filter');
    const species = new Set();
    
    allEvents.forEach(event => {
        if (event.genus) {
            species.add(event.genus);
        }
    });
    
    // Clear existing options except "All genera"
    speciesFilter.innerHTML = '<option value="all">All genera</option>';
    
    // Add species options
    Array.from(species).sort().forEach(genus => {
        const option = document.createElement('option');
        option.value = genus;
        option.textContent = genus;
        speciesFilter.appendChild(option);
    });
}

// Show filters section
function showFiltersSection() {
    document.getElementById('filters-section').style.display = 'block';
}

// Apply all filters to the current events
function applyFilters() {
    if (!allEvents || allEvents.length === 0) {
        return;
    }
    
    const filters = {
        year: document.getElementById('year-filter').value,
        month: document.getElementById('month-filter').value,
        days_after_fm: document.getElementById('days-filter').value,
        species: document.getElementById('species-filter').value
    };
    
    // Show loading state
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('d-none');
    
    // Apply client-side filtering
    setTimeout(() => {
        currentEvents = applyClientSideFilters(allEvents, filters);
        updateResultsDisplay();
        updateSearchSummary(currentEvents);
        loadingIndicator.classList.add('d-none');
    }, 300);
}

// Client-side filtering
function applyClientSideFilters(events, filters) {
    return events.filter(event => {
        // Year filter
        if (filters.year && filters.year !== 'all') {
            const eventYear = parseInt(event.date.split('-')[0]);
            const currentYear = new Date().getFullYear();
            
            if (filters.year === 'last_5') {
                if (eventYear < currentYear - 5) return false;
            } else if (filters.year === 'last_10') {
                if (eventYear < currentYear - 10) return false;
            } else if (!isNaN(parseInt(filters.year))) {
                if (eventYear !== parseInt(filters.year)) return false;
            }
        }
        
        // Month filter
        if (filters.month && filters.month !== 'all') {
            const eventMonth = parseInt(event.date.split('-')[1]);
            if (eventMonth !== parseInt(filters.month)) return false;
        }
        
        // Days after full moon filter
        if (filters.days_after_fm && filters.days_after_fm !== 'all') {
            const filterDays = parseInt(filters.days_after_fm);
            const eventDays = parseInt(event.days_after_full_moon);
            
            if (eventDays !== filterDays) return false;
        }
        
        // Species/Genus filter
        if (filters.species && filters.species !== 'all') {
            if (event.genus.toLowerCase() !== filters.species.toLowerCase()) return false;
        }
        
        return true;
    });
}

// Update search summary with available months and days after full moon
function updateSearchSummary(events) {
    if (!events || events.length === 0) {
        document.getElementById('search-summary').style.display = 'none';
        return;
    }
    
    // Extract unique months and days after full moon
    const months = new Set();
    const daysAfterFM = new Set();
    
    events.forEach(event => {
        // Extract month from date field
        if (event.date) {
            const eventMonth = parseInt(event.date.split('-')[1]);
            if (eventMonth >= 1 && eventMonth <= 12) {
                months.add(eventMonth);
            }
        }
        
        if (event.days_after_full_moon !== null && event.days_after_full_moon !== undefined) {
            daysAfterFM.add(event.days_after_full_moon);
        }
    });
    
    // Convert to sorted arrays
    const sortedMonths = Array.from(months).sort((a, b) => a - b);
    const sortedDays = Array.from(daysAfterFM).sort((a, b) => a - b);
    
    // Month names
    const monthNames = {
        1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
        7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };
    
    // Update months display
    const monthsContainer = document.getElementById('available-months');
    monthsContainer.innerHTML = sortedMonths.map(month => 
        `<span class="summary-tag">${monthNames[month]}</span>`
    ).join('');
    
    // Update days display
    const daysContainer = document.getElementById('available-days');
    daysContainer.innerHTML = sortedDays.map(day => 
        `<span class="summary-tag">${day} day${day !== 1 ? 's' : ''}</span>`
    ).join('');
    
    // Show the summary section
    document.getElementById('search-summary').style.display = 'block';
}

// Export results to CSV
function exportResults() {
    if (!currentEvents || currentEvents.length === 0) {
        alert('No results to export.');
        return;
    }
    
    // Create CSV content
    const headers = ['Genus', 'Species', 'Location', 'Date', 'Start Time', 'End Time', 'Days After Full Moon', 'Gamete Release', 'Distance (km)', 'Reference'];
    const csvContent = [
        headers.join(','),
        ...currentEvents.map(event => [
            event.genus,
            event.species,
            `"${event.location}"`,
            event.date,
            event.start_time,
            event.end_time || '',
            event.days_after_full_moon,
            event.gamete_release,
            event.distance,
            `"${event.reference}"`
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'coral_spawning_events.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}