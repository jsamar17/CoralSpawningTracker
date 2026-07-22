let map;
let selectedMarker;
let currentEvents = [];
let allEvents = [];
let spawningDataCache = null;
let speciesDataCache = null;
let heatLayer = null;
let inverseHeatLayer = null;
let heatmapMode = 'off';
let pdfChartMonths = null;
let pdfChartLunar = null;

// Haversine distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
}

async function loadData() {
    if (!spawningDataCache) {
        const response = await fetch('static/data/coral_spawning_data.json');
        spawningDataCache = await response.json();
    }
    if (!speciesDataCache) {
        const response = await fetch('static/data/coral_species.json');
        speciesDataCache = await response.json();
    }
    return { spawningData: spawningDataCache, speciesData: speciesDataCache };
}

// Initialize the map
function initMap() {
    map = L.map('map').setView([5, 118], 4);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    map.on('click', function(e) {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });
}

// Select a location on the map
function selectLocation(lat, lng) {
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }
    
    selectedMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<i class="fas fa-map-marker-alt" style="color: #0d6efd; font-size: 24px;"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        })
    }).addTo(map);
    
    window.selectedLocation = { lat, lng };
    const searchBtn = document.getElementById('search-events-btn');
    if (searchBtn) searchBtn.disabled = false;
}

// Search for location by name
function searchLocation(query) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                map.setView([lat, lng], 10);
                selectLocation(lat, lng);
            } else {
                alert('Location not found. Please try a different search term or click on the map.');
            }
        })
        .catch(error => {
            console.error('Geocoding error:', error);
            alert('Error searching for location.');
        });
}

// Get user's current location
async function getCurrentLocation() {
    const btn = document.getElementById('locate-me-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Getting location...';
    btn.disabled = true;

    try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { Geolocation } = window.Capacitor.Plugins;
            let permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
                permission = await Geolocation.requestPermissions();
            }
            if (permission.location !== 'granted') {
                throw new Error('Permission denied');
            }
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            finishLocation(position.coords.latitude, position.coords.longitude);
        } else {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by this browser.');
                throw new Error('Not supported');
            }
            navigator.geolocation.getCurrentPosition(
                pos => finishLocation(pos.coords.latitude, pos.coords.longitude),
                err => { throw err },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    } catch (error) {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please ensure location services are enabled across your device.');
        btn.innerHTML = '<i class="fas fa-crosshairs me-2"></i>Use My Location';
        btn.disabled = false;
    }

    function finishLocation(lat, lng) {
        map.setView([lat, lng], 10);
        selectLocation(lat, lng);
        btn.innerHTML = '<i class="fas fa-crosshairs me-2"></i>Use My Location';
        btn.disabled = false;
    }
}

// Search for spawning events
async function searchSpawningEvents() {
    if (!window.selectedLocation) {
        alert('Please select a location first.');
        return;
    }
    
    const radius = parseFloat(document.getElementById('distance-slider').value);
    const loadingIndicator = document.getElementById('loading-indicator');
    const searchBtn = document.getElementById('search-events-btn');
    
    loadingIndicator.classList.remove('d-none');
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
    
    try {
        const { spawningData, speciesData } = await loadData();
        const lat = window.selectedLocation.lat;
        const lon = window.selectedLocation.lng;
        const includeSubs = document.getElementById('include-submissions-toggle')
            && document.getElementById('include-submissions-toggle').checked;
        
        let filtered = [];
        for (let event of spawningData) {
            const eventLat = parseFloat(event.latitude || 0);
            const eventLon = parseFloat(event.longitude || 0);
            const distance = calculateDistance(lat, lon, eventLat, eventLon);
            
            if (distance <= radius) {
                let eventInfo = { ...event };
                eventInfo.distance = Math.round(distance * 100) / 100;
                
                const genus = eventInfo.genus || 'Unknown';
                const genericPlaceholder = 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7';
                
                let finalImageUrl = genericPlaceholder + '?w=400&q=80';
                if (eventInfo.image_url && !eventInfo.image_url.includes('unsplash.com')) {
                    finalImageUrl = eventInfo.image_url;
                } else if (speciesData[genus] && speciesData[genus].image_url) {
                    finalImageUrl = speciesData[genus].image_url;
                }
                
                eventInfo.image_url = finalImageUrl;
                filtered.push(eventInfo);
            }
        }
        
        if (includeSubs) {
            try {
                const resp = await fetch('/api/submissions');
                const payload = await resp.json();
                if (payload.success && payload.submissions.length > 0) {
                    const genericPlaceholder = 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7';
                    for (let sub of payload.submissions) {
                        const subLat = parseFloat(sub.latitude || 0);
                        const subLon = parseFloat(sub.longitude || 0);
                        const distance = calculateDistance(lat, lon, subLat, subLon);
                        if (distance <= radius) {
                            let eventInfo = { ...sub };
                            eventInfo.distance = Math.round(distance * 100) / 100;
                            eventInfo.is_user_submission = true;
                            const genus = eventInfo.genus || 'Unknown';
                            let finalImageUrl = genericPlaceholder + '?w=400&q=80';
                            if (eventInfo.image_url && !eventInfo.image_url.includes('unsplash.com')) {
                                finalImageUrl = eventInfo.image_url;
                            } else if (speciesData[genus] && speciesData[genus].image_url) {
                                finalImageUrl = speciesData[genus].image_url;
                            }
                            eventInfo.image_url = finalImageUrl;
                            filtered.push(eventInfo);
                        }
                    }
                }
            } catch (subErr) {
                console.warn('Could not load user submissions:', subErr);
            }
        }
        
        filtered.sort((a, b) => a.distance - b.distance);
        allEvents = filtered;
        currentEvents = [...allEvents];
        updateResultsDisplay();
        
        // Restore external filter enhancements if window.ensureFilterEnhancements exists
        if (typeof populateSpeciesFilter === 'function') populateSpeciesFilter();
        if (typeof showFiltersSection === 'function') showFiltersSection();
        if (typeof updateSearchSummary === 'function') updateSearchSummary(allEvents);
        if (window.ensureFilterEnhancements) window.ensureFilterEnhancements();
        
    } catch (error) {
        console.error('Search error:', error);
        alert('Error searching for spawning events.');
    } finally {
        loadingIndicator.classList.add('d-none');
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Search Spawning Events';
    }
}

function updateResultsDisplay() {
    const resultsCount = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');
    const eventsGrid = document.getElementById('events-grid');
    const exportBtn = document.getElementById('export-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    
    if (resultsCount) resultsCount.textContent = currentEvents.length;
    
    if (currentEvents.length === 0) {
        if (emptyState) {
            if (allEvents.length > 0) {
                // A search returned results but filters eliminated them all
                emptyState.innerHTML = `
                    <div class="empty-state-content">
                        <i class="fas fa-filter fa-3x mb-3" style="color: var(--accent-primary); opacity: 0.8;"></i>
                        <h4 class="text-muted">No Matching Events</h4>
                        <p class="text-muted" style="line-height: 1.6;">
                            Your filters returned no results from the ${allEvents.length} events found.
                            Try relaxing a filter or clicking <strong>Clear All</strong> to reset.
                        </p>
                    </div>`;
            } else {
                emptyState.innerHTML = `
                    <div class="empty-state-content">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4 class="text-muted">Start Your Search</h4>
                        <p class="text-muted" style="line-height: 1.6;">
                            Select a location on the map, set your search radius, and click "Search Spawning Events" to find coral spawning data in your area.
                            <br><br>
                            <small style="opacity: 0.85;"><em>Note: All data is from the Indo-Pacific Coral Spawning Database.</em></small>
                        </p>
                    </div>`;
            }
            emptyState.style.display = 'flex';
        }
        if (eventsGrid) eventsGrid.style.display = 'none';
        if (exportBtn) exportBtn.disabled = true;
        if (exportPdfBtn) exportPdfBtn.disabled = true;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (eventsGrid) eventsGrid.style.display = 'grid';
        if (exportBtn) exportBtn.disabled = false;
        if (exportPdfBtn) exportPdfBtn.disabled = false;
        renderEventCards();
    }
    
    updateHeatmap();

    const badge = document.getElementById('mobile-badge');
    if (badge) {
        badge.innerText = currentEvents.length;
        badge.style.display = currentEvents.length > 0 ? 'inline-block' : 'none';
    }
}

// 2-state heatmap: off / density
function updateHeatmap() {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    if (heatmapMode !== 'heatmap' || currentEvents.length === 0) return;

    const heatData = currentEvents.map(e => [
        parseFloat(e.latitude), parseFloat(e.longitude), 1.0
    ]);
    heatLayer = L.heatLayer(heatData, {
        radius: 40, blur: 25, maxZoom: 17, max: 0.4, minOpacity: 0.5,
        gradient: { 0.2: '#0f84bc', 0.5: '#f6e05e', 0.8: '#f56565', 1.0: '#c53030' }
    }).addTo(map);
}

// Handle Mobile Navigation
window.showMobileView = function(view) {
    document.body.setAttribute('data-mobile-view', view);
    
    const mapPanel = document.getElementById('mobile-map-panel');
    const resultsPanel = document.getElementById('mobile-results-panel');
    const mapBtn = document.getElementById('nav-map-btn');
    const resultsBtn = document.getElementById('nav-results-btn');
    const exportBtn = document.getElementById('nav-export-btn');
    
    // Clear all active classes
    if (mapBtn) mapBtn.classList.remove('active');
    if (resultsBtn) resultsBtn.classList.remove('active');
    if (exportBtn) exportBtn.classList.remove('active');
    
    if (view === 'map') {
        mapPanel.classList.add('mobile-active');
        resultsPanel.classList.remove('mobile-active');
        if (mapBtn) mapBtn.classList.add('active');
        setTimeout(() => map.invalidateSize(), 150);
    } else if (view === 'export') {
        mapPanel.classList.add('mobile-active');
        resultsPanel.classList.remove('mobile-active');
        if (exportBtn) exportBtn.classList.add('active');
    } else if (view === 'results') {
        resultsPanel.classList.add('mobile-active');
        mapPanel.classList.remove('mobile-active');
        if (resultsBtn) resultsBtn.classList.add('active');
    }
};

// Initialize mobile view correctly
document.body.setAttribute('data-mobile-view', 'map');

// Render event cards
function renderEventCards() {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;
    eventsGrid.innerHTML = '';
    currentEvents.forEach(event => {
        const card = createEventCard(event);
        eventsGrid.appendChild(card);
    });
}

// Create event card element - RESTORED FULL FEATURES
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = event.is_user_submission
        ? 'event-card fade-in user-submission-card'
        : 'event-card fade-in';
    card.onclick = () => showEventDetails(event);
    
    const date = new Date(event.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const submissionBadge = event.is_user_submission
        ? '<span class="user-submission-badge"><i class="fas fa-user-pen me-1"></i>User Submitted</span>'
        : '';
    
    const submittedBy = event.submitted_by
        ? `<div class="info-item"><i class="fas fa-user"></i><span>${event.submitted_by}</span></div>`
        : '';
    
    const refText = event.is_user_submission
        ? (event.reference || 'User observation')
        : (event.reference || '');

    card.innerHTML = `
        <img src="${event.image_url}" alt="${event.genus} ${event.species}" class="event-card-image" 
             onerror="this.src='https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=300'">
        <div class="event-card-content">
            <h6 class="event-card-title">${event.genus} ${event.species} ${submissionBadge}</h6>
            <p class="event-card-subtitle">${event.location}</p>
            <div class="event-card-info">
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formattedDate}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${event.start_time || ''}${event.start_time && event.end_time ? ' - ' : ''}${event.end_time || ''}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-moon"></i>
                    <span>${event.days_after_full_moon != null ? event.days_after_full_moon + ' days after FM' : 'N/A'}</span>
                </div>
                ${submittedBy}
            </div>
        </div>
        <div class="event-card-footer">
            <span class="distance-badge">${event.distance} km away</span>
            <span class="reference-text">${refText}</span>
        </div>
    `;
    
    return card;
}

// Show event details in modal - RESTORED WORMS LINK AND FULL DETAILS
function showEventDetails(event) {
    const modalEl = document.getElementById('eventModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
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
    
    const wormsUrl = `https://www.marinespecies.org/aphia.php?p=taxlist&tName=${encodeURIComponent(event.genus + ' ' + event.species)}`;

    const timeStr = event.start_time || event.end_time
        ? `${event.start_time || '?'} - ${event.end_time || '?'}`
        : 'N/A';
    const lunarStr = event.days_after_full_moon != null
        ? event.days_after_full_moon
        : 'N/A';
    const sourceBadge = event.is_user_submission
        ? '<div class="mb-2" style="color: var(--accent-primary);"><strong><i class="fas fa-user-pen me-1"></i>User-Submitted Observation</strong></div>'
        : '';

    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <a href="${wormsUrl}" target="_blank" rel="noopener noreferrer" 
                   title="View ${event.genus} ${event.species} on WoRMS (World Register of Marine Species)"
                   class="worms-photo-link">
                    <img src="${event.image_url}" alt="${event.genus} ${event.species}" 
                         class="img-fluid rounded mb-3" style="width: 100%; height: 250px; object-fit: cover; cursor: pointer;"
                         onerror="this.src='https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=500'">
                    <div class="worms-link-overlay">
                        <i class="fas fa-external-link-alt me-1"></i> View on WoRMS
                    </div>
                </a>
            </div>
            <div class="col-md-6">
                ${sourceBadge}
                <h5 class="text-primary mb-3">Event Details</h5>
                <div class="mb-2"><strong>Species:</strong> <em>${event.genus} ${event.species}</em></div>
                <div class="mb-2"><strong>Location:</strong> ${event.location}</div>
                <div class="mb-2"><strong>Coordinates:</strong> ${event.latitude}°, ${event.longitude}°</div>
                <div class="mb-2"><strong>Date:</strong> ${formattedDate}</div>
                <div class="mb-2"><strong>Time:</strong> ${timeStr}</div>
                <div class="mb-2"><strong>Days After Full Moon:</strong> ${lunarStr}</div>
                <div class="mb-2"><strong>Gamete Release:</strong> ${event.gamete_release || 'N/A'}</div>
                <div class="mb-2"><strong>Observation Type:</strong> ${event.situation || 'N/A'}</div>
                <div class="mb-2"><strong>Distance:</strong> ${event.distance} km away</div>
                <div class="mb-2"><strong>Reference:</strong> ${event.reference || (event.is_user_submission ? 'User observation' : 'N/A')}</div>
                ${event.submitted_by ? `<div class="mb-2"><strong>Submitted by:</strong> ${event.submitted_by}</div>` : ''}
            </div>
        </div>
    `;
    modal.show();
}

// Generate PDF Charts — accepts pre-computed data objects
function generatePdfCharts(monthCounts, lunarCounts) {
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const lunarKeys = Object.keys(lunarCounts).map(Number).sort((a, b) => a - b);
    const lunarVals = lunarKeys.map(k => lunarCounts[k]);
    const maxMonth = Math.max(...monthCounts);
    const maxLunar = Math.max(...lunarVals);

    const baseOpts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 9 } }, grid: { color: '#f0f0f0' } },
            x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        }
    };

    if (pdfChartMonths) pdfChartMonths.destroy();
    const ctxM = document.getElementById('pdf-chart-months');
    if (ctxM) {
        pdfChartMonths = new Chart(ctxM, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{ data: monthCounts, backgroundColor: monthCounts.map(v => v === maxMonth ? '#ec2547' : '#0a4275'), borderRadius: 3 }]
            },
            options: baseOpts
        });
    }

    if (pdfChartLunar) pdfChartLunar.destroy();
    const ctxL = document.getElementById('pdf-chart-lunar');
    if (ctxL) {
        pdfChartLunar = new Chart(ctxL, {
            type: 'bar',
            data: {
                labels: lunarKeys.map(k => k >= 0 ? `+${k}` : `${k}`),
                datasets: [{ data: lunarVals, backgroundColor: lunarVals.map(v => v === maxLunar ? '#ec2547' : '#0f84bc'), borderRadius: 3 }]
            },
            options: baseOpts
        });
    }
}

// Export results to PDF — Redesigned two-page layout
async function exportPDFResults() {
    if (currentEvents.length === 0) return;

    const pdfBtn = document.getElementById('export-pdf-btn');
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';

    try {
        const radius = parseFloat(document.getElementById('distance-slider').value);
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const lat = window.selectedLocation.lat;
        const lon = window.selectedLocation.lng;

        // ── 1. Compute statistics ─────────────────────────────────
        const genusCounts = {};
        const monthCounts = Array(12).fill(0);
        const lunarCounts = {};
        let minYear = Infinity, maxYear = 0;

        currentEvents.forEach(e => {
            genusCounts[e.genus] = (genusCounts[e.genus] || 0) + 1;
            const d = new Date(e.date);
            if (!isNaN(d)) {
                monthCounts[d.getMonth()]++;
                const yr = d.getFullYear();
                if (yr < minYear) minYear = yr;
                if (yr > maxYear) maxYear = yr;
            }
            const ld = parseInt(e.days_after_full_moon);
            if (!isNaN(ld)) lunarCounts[ld] = (lunarCounts[ld] || 0) + 1;
        });

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const fullMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const sortedGenera = Object.entries(genusCounts).sort((a, b) => b[1] - a[1]);
        const peakMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
        const peakLunar = Object.entries(lunarCounts).sort((a, b) => b[1] - a[1])[0];
        const yearRange = minYear === maxYear ? `${minYear}` : `${minYear}\u2013${maxYear}`;

        // ── 2. Meta line ──────────────────────────────────────────
        const metaEl = document.getElementById('pdf-meta-line');
        if (metaEl) {
            const latDir = lat >= 0 ? 'N' : 'S';
            const lonDir = lon >= 0 ? 'E' : 'W';
            metaEl.innerHTML = `
                <strong>Center:</strong> ${Math.abs(lat).toFixed(3)}&deg;${latDir}, ${Math.abs(lon).toFixed(3)}&deg;${lonDir}
                &nbsp;&nbsp;<strong>Radius:</strong> ${radius} km
                &nbsp;&nbsp;<strong>Records:</strong> ${currentEvents.length}
                &nbsp;&nbsp;<strong>Generated:</strong> ${today}`;
        }

        // ── 3. Stats row ──────────────────────────────────────────
        const statsRow = document.getElementById('pdf-stats-row');
        if (statsRow) {
            const stats = [
                { val: currentEvents.length, label: 'Total Events' },
                { val: sortedGenera.length, label: 'Unique Genera' },
                { val: fullMonthNames[peakMonthIdx], label: 'Peak Month' },
                { val: peakLunar ? (parseInt(peakLunar[0]) >= 0 ? '+' : '') + peakLunar[0] + 'd' : 'N/A', label: 'Peak Lunar Day' },
                { val: yearRange, label: 'Data Range' }
            ];
            statsRow.innerHTML = stats.map(s => `
                <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px 10px; text-align: center; border-top: 3px solid #ec2547;">
                    <div style="font-size: 17px; font-weight: 700; color: #111;">${s.val}</div>
                    <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px;">${s.label}</div>
                </div>`).join('');
        }

        // ── 4. Genus mini-bars ────────────────────────────────────
        const genusEl = document.getElementById('pdf-genus-bars');
        if (genusEl && sortedGenera.length > 0) {
            const maxCount = sortedGenera[0][1];
            genusEl.innerHTML = sortedGenera.slice(0, 9).map(([genus, count]) => {
                const pct = Math.round((count / maxCount) * 100);
                return `<div style="display: flex; align-items: center; margin-bottom: 7px;">
                    <div style="width: 82px; font-size: 11.5px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${genus}</div>
                    <div style="flex: 1; height: 11px; background: #e8eef4; border-radius: 2px; margin: 0 7px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: #0f84bc; border-radius: 2px;"></div>
                    </div>
                    <div style="width: 28px; font-size: 10.5px; color: #888; text-align: right;">${count}</div>
                </div>`;
            }).join('');
        }

        // ── 5. Map snapshot ───────────────────────────────────────
        // Capture div is exactly 2× the PDF display container (850×400 vs 425×200)
        // so the aspect ratio is perfectly preserved without any drawImage distortion.
        const captureEl = document.createElement('div');
        captureEl.style.cssText = 'position:fixed;top:0;left:0;width:850px;height:400px;z-index:10000;background:#dde8f0;';
        document.body.appendChild(captureEl);

        const pdfZoom = (r) => r <= 5 ? 13 : r <= 15 ? 11 : r <= 50 ? 9 : r <= 150 ? 7 : r <= 500 ? 6 : 5;
        const captureZoom = pdfZoom(radius);

        try {
            const tempMap = L.map(captureEl, { attributionControl: false, zoomControl: false, fadeAnimation: false, zoomAnimation: false });
            const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(tempMap);

            // invalidateSize BEFORE setView so Leaflet knows the correct 850x400 dimensions
            tempMap.invalidateSize(true);
            tempMap.setView([lat, lon], captureZoom, { animate: false });

            // Wait for tile loads, then re-center to guarantee correct position
            await new Promise(r => { let n = 0; tiles.on('tileload', () => { if (++n >= 6) r(); }); setTimeout(r, 3000); });
            tempMap.setView([lat, lon], captureZoom, { animate: false });
            await new Promise(r => setTimeout(r, 300));

            // No Leaflet overlays here — circle & pin are CSS overlays on the PDF template
            // so they are always pixel-perfectly centered on the map image.
            const canvas = await html2canvas(captureEl, { useCORS: true, scale: 1, logging: false });
            document.getElementById('pdf-map-snapshot').src = canvas.toDataURL('image/jpeg', 0.92);
            tempMap.remove();
        } finally {
            document.body.removeChild(captureEl);
        }

        // Calculate CSS circle radius for the overlay.
        // At zoom Z: 1 screen-px = 40075 * cos(lat) / (256 * 2^Z) km
        // Display is 425px wide (capture is 850px = 2×), so divide pixel radius by 2.
        const latRad = lat * Math.PI / 180;
        const circleRpx = Math.round(radius * 256 * Math.pow(2, captureZoom) / (2 * 40075 * Math.cos(latRad)));
        const circleEl = document.getElementById('pdf-map-circle');
        const pinEl = document.getElementById('pdf-map-pin');
        if (circleEl) {
            circleEl.style.width  = (circleRpx * 2) + 'px';
            circleEl.style.height = (circleRpx * 2) + 'px';
            circleEl.style.display = 'block';
        }
        if (pinEl) pinEl.style.display = 'block';

        // ── 7. Events table ───────────────────────────────────────
        const displayEvents = currentEvents.slice(0, 250);
        const tableSubtitle = document.getElementById('pdf-table-subtitle');
        if (tableSubtitle) {
            tableSubtitle.textContent = currentEvents.length > 250
                ? `Nearest 250 of ${currentEvents.length} events, sorted by distance from search point`
                : `${currentEvents.length} events, sorted by distance from search point`;
        }
        const tableBody = document.getElementById('pdf-table-body');
        if (tableBody) {
            tableBody.innerHTML = displayEvents.map((e, i) => {
                const d = new Date(e.date);
                const dateStr = !isNaN(d) ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (e.date || 'N/A');
                const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                const dafm = e.days_after_full_moon !== null && e.days_after_full_moon !== undefined;
                const dafmStr = dafm ? (e.days_after_full_moon >= 0 ? '+' : '') + e.days_after_full_moon : 'N/A';
                const isSitu = e.situation === 'In situ';
                return `<tr style="background: ${rowBg}; border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 5px 8px; font-style: italic; color: #1a1a1a;">${e.genus} ${e.species}</td>
                    <td style="padding: 5px 8px; color: #555; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e.location || 'N/A'}</td>
                    <td style="padding: 5px 6px; text-align: center; color: #444; white-space: nowrap;">${dateStr}</td>
                    <td style="padding: 5px 6px; text-align: center; color: #444;">${e.distance ?? 'N/A'}</td>
                    <td style="padding: 5px 6px; text-align: center; font-weight: 700; color: ${dafm && e.days_after_full_moon >= 0 ? '#0a4275' : '#7c3aed'};">${dafmStr}</td>
                    <td style="padding: 5px 6px; text-align: center;">
                        <span style="font-size: 9px; padding: 2px 5px; border-radius: 8px; background: ${isSitu ? '#d1fae5' : '#ede9fe'}; color: ${isSitu ? '#065f46' : '#5b21b6'}; font-weight: 600; white-space: nowrap;">${e.situation || 'N/A'}</span>
                    </td>
                </tr>`;
            }).join('');
        }

        // ── 8. Render — constrain to letter paper width, show, then render charts ───────
        const container = document.getElementById('pdf-export-container');
        container.style.width = '816px'; // 8.5in at 96dpi — constrains Chart.js canvases
        container.style.display = 'block';
        await new Promise(r => setTimeout(r, 300));

        // ── 6b. Charts (MUST run after container visible) ─────────
        generatePdfCharts(monthCounts, lunarCounts);
        await new Promise(r => setTimeout(r, 900)); // let charts render

        const dateStr = new Date().toISOString().slice(0,10);
        const filename = `reef_scuba_dive_plan_${dateStr}.pdf`;
        const pdfOpt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.97 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { Filesystem, Share } = window.Capacitor.Plugins;
            const pdfBase64DataUri = await html2pdf().set(pdfOpt).from(container).outputPdf('datauristring');
            const base64Data = pdfBase64DataUri.split(',')[1];
            
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
            });
            await Share.share({
                title: 'Coral Spawning Dive Plan',
                url: result.uri,
                dialogTitle: 'Save or Share PDF'
            });
        } else {
            await html2pdf().set(pdfOpt).from(container).save();
        }

        container.style.display = 'none';
        container.style.width = ''; // reset width

    } catch (error) {
        console.error('PDF Generation Failure:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>PDF Report';
    }
}

// Export results to CSV — all available fields
async function exportResults() {
    if (currentEvents.length === 0) return;
    const exportBtn = document.getElementById('export-btn');
    if(exportBtn) { exportBtn.disabled = true; exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...'; }

    try {
        const esc = val => {
            const s = (val !== null && val !== undefined) ? String(val) : '';
            return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const headers = ['Date','Year','Genus','Species','Location','Latitude','Longitude',
            'Start_Time','End_Time','Days_After_Full_Moon','Gamete_Release','Observation_Type','Reference','Distance_km'];
        let csv = headers.join(',') + '\n';
        currentEvents.forEach(e => {
            const year = e.date ? e.date.split('-')[0] : '';
            csv += [
                esc(e.date), esc(year), esc(e.genus), esc(e.species), esc(e.location),
                esc(e.latitude), esc(e.longitude), esc(e.start_time), esc(e.end_time),
                esc(e.days_after_full_moon), esc(e.gamete_release), esc(e.situation),
                esc(e.reference), esc(e.distance)
            ].join(',') + '\n';
        });

        const filename = `reef_scuba_coral_data_${new Date().toISOString().slice(0,10)}.csv`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { Filesystem, Share } = window.Capacitor.Plugins;
            const result = await Filesystem.writeFile({
                path: filename,
                data: csv,
                directory: 'CACHE',
                encoding: 'utf8'
            });
            await Share.share({
                title: 'Coral Spawning Data',
                url: result.uri,
                dialogTitle: 'Save or Share Data'
            });
        } else {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    } finally {
        if(exportBtn) { exportBtn.disabled = false; exportBtn.innerHTML = '<i class="fas fa-file-csv me-2"></i>CSV Export'; }
    }
}

// Show filters / etc
function showFiltersSection() { document.getElementById('filters-section').style.display = 'block'; }
function populateSpeciesFilter() {
    const filter = document.getElementById('species-filter');
    if (!filter) return;
    const genera = [...new Set(allEvents.map(e => e.genus))].sort();
    filter.innerHTML = '<option value="all">All genera</option>';
    genera.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.textContent = g; filter.appendChild(opt);
    });
}



document.addEventListener('DOMContentLoaded', () => {
    initMap();
    if (document.getElementById('distance-slider')) {
        document.getElementById('distance-slider').oninput = function() {
            document.getElementById('distance-value').textContent = this.value;
        };
    }
    if (document.getElementById('search-btn')) {
        document.getElementById('search-btn').onclick = () => {
            const q = document.getElementById('location-search').value;
            if (q) searchLocation(q);
        };
    }
    if (document.getElementById('location-search')) {
        document.getElementById('location-search').onkeypress = (e) => {
            if (e.key === 'Enter') {
                const q = e.target.value;
                if (q) searchLocation(q);
            }
        };
    }
    if (document.getElementById('locate-me-btn')) document.getElementById('locate-me-btn').onclick = getCurrentLocation;
    if (document.getElementById('search-events-btn')) document.getElementById('search-events-btn').onclick = searchSpawningEvents;
    if (document.getElementById('export-btn')) document.getElementById('export-btn').onclick = exportResults;
    if (document.getElementById('export-pdf-btn')) document.getElementById('export-pdf-btn').onclick = exportPDFResults;

    // 3-state heatmap control
    document.querySelectorAll('.heatmap-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            heatmapMode = btn.dataset.mode;
            document.querySelectorAll('.heatmap-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateHeatmap();
        });
    });
});
