// State for clickable tags
window.activeMonthTags = new Set();
window.activeDayTags = new Set();

// ── Tag toggle with cascading logic ──────────────────────────────
window.toggleMonthTag = function(month) {
    if (window.activeMonthTags.has(month)) {
        window.activeMonthTags.delete(month);
    } else {
        window.activeMonthTags.add(month);
    }
    // Cascade: prune day tags that no longer have matching data
    pruneOrphanedTags();
    updateTagVisuals();
    applyAllFilters();
};

window.toggleDayTag = function(day) {
    if (window.activeDayTags.has(day)) {
        window.activeDayTags.delete(day);
    } else {
        window.activeDayTags.add(day);
    }
    // Cascade: prune month tags that no longer have matching data
    pruneOrphanedTags();
    updateTagVisuals();
    applyAllFilters();
};

/**
 * Prune orphaned tags: remove any selected month/day tags
 * that no longer have matching events given the other dimension's selection.
 */
function pruneOrphanedTags() {
    if (!allEvents || allEvents.length === 0) return;

    // Get events that match current dropdown filters (year, genus, situation)
    // but NOT month/day tag selections — we need the base set
    const baseFilters = getDropdownFilters();
    const baseEvents = applyDropdownFilters(allEvents, baseFilters);

    // If months are selected, find which days are still available
    if (window.activeMonthTags.size > 0) {
        const eventsMatchingMonths = baseEvents.filter(e => {
            const m = getEventMonth(e);
            return m !== null && window.activeMonthTags.has(m);
        });
        const availableDays = new Set();
        eventsMatchingMonths.forEach(e => {
            if (e.days_after_full_moon !== null && e.days_after_full_moon !== undefined) {
                availableDays.add(parseInt(e.days_after_full_moon));
            }
        });
        // Remove any selected day tags that aren't available
        for (const day of [...window.activeDayTags]) {
            if (!availableDays.has(day)) {
                window.activeDayTags.delete(day);
            }
        }
    }

    // If days are selected, find which months are still available
    if (window.activeDayTags.size > 0) {
        const eventsMatchingDays = baseEvents.filter(e => {
            if (e.days_after_full_moon === null || e.days_after_full_moon === undefined) return false;
            return window.activeDayTags.has(parseInt(e.days_after_full_moon));
        });
        const availableMonths = new Set();
        eventsMatchingDays.forEach(e => {
            const m = getEventMonth(e);
            if (m !== null) availableMonths.add(m);
        });
        // Remove any selected month tags that aren't available
        for (const month of [...window.activeMonthTags]) {
            if (!availableMonths.has(month)) {
                window.activeMonthTags.delete(month);
            }
        }
    }
}

/**
 * Helper: extract month from an event
 */
function getEventMonth(event) {
    if (event.month_spawning) {
        return parseInt(event.month_spawning);
    } else if (event.date) {
        const m = parseInt(event.date.split('-')[1]);
        return (m >= 1 && m <= 12) ? m : null;
    }
    return null;
}

/**
 * Get current dropdown filter values (excludes tag-based filters)
 */
function getDropdownFilters() {
    return {
        year: document.getElementById('year-filter').value,
        month: document.getElementById('month-filter').value,
        days_after_fm: document.getElementById('days-filter').value,
        species: document.getElementById('species-filter').value,
        situation: document.getElementById('situation-filter') ? document.getElementById('situation-filter').value : 'all'
    };
}

/**
 * Apply only dropdown filters (not tag-based), used for computing available tag options
 */
function applyDropdownFilters(events, filters) {
    return events.filter(event => {
        // Year filter
        if (filters.year && filters.year !== 'all') {
            const eventYear = parseInt(event.date.split('-')[0]);
            const currentYear = new Date().getFullYear();
            if (filters.year === 'last_5' && eventYear < currentYear - 5) return false;
            if (filters.year === 'last_10' && eventYear < currentYear - 10) return false;
            if (!isNaN(parseInt(filters.year)) && filters.year !== 'last_5' && filters.year !== 'last_10') {
                if (eventYear !== parseInt(filters.year)) return false;
            }
        }
        // Month dropdown filter
        if (filters.month && filters.month !== 'all') {
            const eventMonth = parseInt(event.date.split('-')[1]);
            if (eventMonth !== parseInt(filters.month)) return false;
        }
        // Days after full moon dropdown filter
        if (filters.days_after_fm && filters.days_after_fm !== 'all') {
            if (event.days_after_full_moon === null || event.days_after_full_moon === undefined) return false;
            const filterDays = parseInt(filters.days_after_fm);
            const eventDays = parseInt(event.days_after_full_moon);
            if (Math.abs(eventDays - filterDays) > 1) return false;
        }
        // Species/Genus filter
        if (filters.species && filters.species !== 'all') {
            if (event.genus.toLowerCase() !== filters.species.toLowerCase()) return false;
        }
        // Situation filter
        if (filters.situation && filters.situation !== 'all') {
            if (!event.situation || event.situation.toLowerCase() !== filters.situation.toLowerCase()) return false;
        }
        return true;
    });
}

/**
 * Update tag visuals — highlight active, gray out inactive,
 * and dim tags that have no data given current cross-selections.
 */
function updateTagVisuals() {
    if (!allEvents || allEvents.length === 0) return;

    // Get base events from dropdown filters
    const baseFilters = getDropdownFilters();
    const baseEvents = applyDropdownFilters(allEvents, baseFilters);

    // Compute available months given currently selected DAYS
    const availableMonths = new Set();
    let monthSourceEvents = baseEvents;
    if (window.activeDayTags.size > 0) {
        monthSourceEvents = baseEvents.filter(e => {
            if (e.days_after_full_moon === null || e.days_after_full_moon === undefined) return false;
            return window.activeDayTags.has(parseInt(e.days_after_full_moon));
        });
    }
    monthSourceEvents.forEach(e => {
        const m = getEventMonth(e);
        if (m !== null) availableMonths.add(m);
    });

    // Compute available days given currently selected MONTHS
    const availableDays = new Set();
    let daySourceEvents = baseEvents;
    if (window.activeMonthTags.size > 0) {
        daySourceEvents = baseEvents.filter(e => {
            const m = getEventMonth(e);
            return m !== null && window.activeMonthTags.has(m);
        });
    }
    daySourceEvents.forEach(e => {
        if (e.days_after_full_moon !== null && e.days_after_full_moon !== undefined) {
            availableDays.add(parseInt(e.days_after_full_moon));
        }
    });

    // Update month tag visuals
    document.querySelectorAll('#available-months .summary-tag').forEach(el => {
        const val = parseInt(el.dataset.val);
        const isSelected = window.activeMonthTags.has(val);
        const isAvailable = availableMonths.has(val);

        if (window.activeMonthTags.size === 0 && window.activeDayTags.size === 0) {
            el.style.opacity = '1';
            el.style.filter = 'grayscale(0%)';
            el.classList.remove('tag-unavailable', 'active-tag');
        } else if (isSelected) {
            el.style.opacity = '1';
            el.style.filter = 'grayscale(0%)';
            el.classList.remove('tag-unavailable');
            el.classList.add('active-tag');
        } else if (isAvailable) {
            el.style.opacity = '0.6';
            el.style.filter = 'grayscale(30%)';
            el.classList.remove('tag-unavailable', 'active-tag');
        } else {
            el.style.opacity = '0.25';
            el.style.filter = 'grayscale(100%)';
            el.classList.add('tag-unavailable');
            el.classList.remove('active-tag');
        }
    });

    // Update day tag visuals
    document.querySelectorAll('#available-days .summary-tag').forEach(el => {
        const val = parseInt(el.dataset.val);
        const isSelected = window.activeDayTags.has(val);
        const isAvailable = availableDays.has(val);

        if (window.activeDayTags.size === 0 && window.activeMonthTags.size === 0) {
            el.style.opacity = '1';
            el.style.filter = 'grayscale(0%)';
            el.classList.remove('tag-unavailable', 'active-tag');
        } else if (isSelected) {
            el.style.opacity = '1';
            el.style.filter = 'grayscale(0%)';
            el.classList.remove('tag-unavailable');
            el.classList.add('active-tag');
        } else if (isAvailable) {
            el.style.opacity = '0.6';
            el.style.filter = 'grayscale(30%)';
            el.classList.remove('tag-unavailable', 'active-tag');
        } else {
            el.style.opacity = '0.25';
            el.style.filter = 'grayscale(100%)';
            el.classList.add('tag-unavailable');
            el.classList.remove('active-tag');
        }
    });
}

// ── Filter functionality ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    const yearFilter = document.getElementById('year-filter');
    const monthFilter = document.getElementById('month-filter');
    const daysFilter = document.getElementById('days-filter');
    const speciesFilter = document.getElementById('species-filter');
    const situationFilter = document.getElementById('situation-filter');

    [yearFilter, monthFilter, daysFilter, speciesFilter, situationFilter].forEach(filter => {
        if (filter) filter.addEventListener('change', applyAllFilters);
    });
});

/**
 * Master filter function — applies all filters (dropdowns + tags) and updates the display
 */
function applyAllFilters() {
    if (!allEvents || allEvents.length === 0) return;

    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.remove('d-none');

    setTimeout(() => {
        // Apply dropdown filters first
        const filters = getDropdownFilters();
        let filtered = applyDropdownFilters(allEvents, filters);

        // Apply tag filters
        if (window.activeMonthTags && window.activeMonthTags.size > 0) {
            filtered = filtered.filter(event => {
                const m = getEventMonth(event);
                return m !== null && window.activeMonthTags.has(m);
            });
        }
        if (window.activeDayTags && window.activeDayTags.size > 0) {
            filtered = filtered.filter(event => {
                if (event.days_after_full_moon === null || event.days_after_full_moon === undefined) return false;
                return window.activeDayTags.has(parseInt(event.days_after_full_moon));
            });
        }

        currentEvents = filtered;
        updateResultsDisplay();
        updateTagVisuals();
        updateFilterSummary();
        loadingIndicator.classList.add('d-none');
    }, 10);
}

// Keep old name as alias for backward compat (called from map.js indirectly)
function applyFilters() {
    applyAllFilters();
}

// ── Search summary ───────────────────────────────────────────────
function updateSearchSummary(events) {
    if (!events || events.length === 0) {
        document.getElementById('search-summary').style.display = 'none';
        return;
    }

    const months = new Set();
    const daysAfterFM = new Set();

    events.forEach(event => {
        const m = getEventMonth(event);
        if (m !== null) months.add(m);
        if (event.days_after_full_moon !== null && event.days_after_full_moon !== undefined) {
            daysAfterFM.add(parseInt(event.days_after_full_moon));
        }
    });

    const sortedMonths = Array.from(months).sort((a, b) => a - b);
    const sortedDays = Array.from(daysAfterFM).sort((a, b) => a - b);

    const monthNames = {
        1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
        7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };

    const monthsContainer = document.getElementById('available-months');
    monthsContainer.innerHTML = sortedMonths.map(month =>
        `<span class="summary-tag" data-val="${month}" onclick="toggleMonthTag(${month})" style="cursor: pointer; transition: all 0.2s;">${monthNames[month]}</span>`
    ).join('');

    const daysContainer = document.getElementById('available-days');
    daysContainer.innerHTML = sortedDays.map(day =>
        `<span class="summary-tag" data-val="${day}" onclick="toggleDayTag(${day})" style="cursor: pointer; transition: all 0.2s;">${day} day${Math.abs(day) !== 1 ? 's' : ''}</span>`
    ).join('');

    // Clear tag selections on new search
    if (window.activeMonthTags) window.activeMonthTags.clear();
    if (window.activeDayTags) window.activeDayTags.clear();
    updateTagVisuals();

    document.getElementById('search-summary').style.display = 'block';
}

// ── Reset ────────────────────────────────────────────────────────
function resetFilters() {
    if (window.activeMonthTags) window.activeMonthTags.clear();
    if (window.activeDayTags) window.activeDayTags.clear();
    updateTagVisuals();

    document.getElementById('year-filter').value = 'all';
    document.getElementById('month-filter').value = 'all';
    document.getElementById('days-filter').value = 'all';
    document.getElementById('species-filter').value = 'all';
    if (document.getElementById('situation-filter')) {
        document.getElementById('situation-filter').value = 'all';
    }

    currentEvents = [...allEvents];
    updateResultsDisplay();
    updateFilterSummary();
}

// ── Filter summary display ───────────────────────────────────────
function getFilterSummary() {
    const filters = getDropdownFilters();
    const activeFilters = [];

    if (filters.year !== 'all') {
        if (filters.year === 'last_5') activeFilters.push('Last 5 years');
        else if (filters.year === 'last_10') activeFilters.push('Last 10 years');
        else activeFilters.push(`Year ${filters.year}`);
    }

    if (filters.month !== 'all') {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        activeFilters.push(monthNames[parseInt(filters.month)]);
    }

    if (filters.days_after_fm !== 'all') {
        activeFilters.push(`${filters.days_after_fm} days after full moon`);
    }

    if (filters.species !== 'all') {
        activeFilters.push(`Genus: ${filters.species}`);
    }

    if (filters.situation !== 'all') {
        activeFilters.push(`Type: ${filters.situation}`);
    }

    // Tag selections
    if (window.activeMonthTags && window.activeMonthTags.size > 0) {
        const monthNames = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};
        const names = [...window.activeMonthTags].sort((a,b)=>a-b).map(m => monthNames[m]);
        activeFilters.push(`Months: ${names.join(', ')}`);
    }

    if (window.activeDayTags && window.activeDayTags.size > 0) {
        const days = [...window.activeDayTags].sort((a,b)=>a-b).join(', ');
        activeFilters.push(`Days: ${days}`);
    }

    return activeFilters;
}

function updateFilterSummary() {
    const summary = getFilterSummary();
    let summaryElement = document.getElementById('filter-summary');

    if (summary.length === 0) {
        if (summaryElement) summaryElement.style.display = 'none';
        return;
    }

    if (!summaryElement) {
        const filtersSection = document.getElementById('filters-section');
        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'filter-summary';
        summaryDiv.className = 'filter-summary mt-3';
        filtersSection.appendChild(summaryDiv);
        summaryElement = summaryDiv;
    }

    summaryElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <small class="text-muted">Active filters:</small>
                <div class="mt-1">
                    ${summary.map(filter => `<span class="badge bg-primary me-1">${filter}</span>`).join('')}
                </div>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="resetFilters()">
                <i class="fas fa-times me-1"></i>Clear All
            </button>
        </div>
    `;
    summaryElement.style.display = 'block';
}
