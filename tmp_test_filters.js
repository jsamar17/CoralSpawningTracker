const fs = require('fs');

const allEvents = JSON.parse(fs.readFileSync('c:/Users/graha/OneDrive - REEF Scuba/Documents/Vibe Coding/CoralSpawningTracker/CoralSpawningTracker/data/coral_spawning_data.json', 'utf8'));

global.activeMonthTags = new Set();
global.activeDayTags = new Set();

function applyClientSideFilters(events, filters) {
    return events.filter(event => {
        // Tag filter (Months)
        if (global.activeMonthTags && global.activeMonthTags.size > 0) {
            let eventMonth = null;
            if (event.month_spawning) {
                eventMonth = parseInt(event.month_spawning);
            } else if (event.date) {
                eventMonth = parseInt(event.date.split('-')[1]);
            }
            if (eventMonth !== null && !global.activeMonthTags.has(eventMonth)) return false;
        }

        // Tag filter (Days)
        if (global.activeDayTags && global.activeDayTags.size > 0) {
            if (event.days_after_full_moon === null || event.days_after_full_moon === undefined) return false;
            const eventDays = parseInt(event.days_after_full_moon);
            if (!global.activeDayTags.has(eventDays)) return false;
        }

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
            if (event.days_after_full_moon === null || event.days_after_full_moon === undefined) {
                return false;
            }
            
            const filterDays = parseInt(filters.days_after_fm);
            const eventDays = parseInt(event.days_after_full_moon);
            
            // Allow 1 day tolerance
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

try {
    let filters = { year: 'all', month: 'all', days_after_fm: 'all', species: 'all', situation: 'Ex situ' };
    console.log("Filtering situation Ex situ...");
    let result = applyClientSideFilters(allEvents, filters);
    console.log("Result length:", result.length);

    filters.situation = 'all';
    global.activeMonthTags.add(10);
    console.log("Filtering activeMonthTags 10...");
    result = applyClientSideFilters(allEvents, filters);
    console.log("Result length:", result.length);
} catch (e) {
    console.error(e);
}
