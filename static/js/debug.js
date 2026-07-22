let map, marker;
let currentPage = 1;
const PER_PAGE = 50;

const GENUSES = [
    'Acropora', 'Porites', 'Montipora', 'Stylophora', 'Pocillopora',
    'Seriatopora', 'Millepora', 'Favites', 'Goniastrea', 'Platygyra',
    'Cyphastrea', 'Echinopora', 'Galaxea', 'Hydnophora', 'Merulina',
    'Montastraea', 'Turbinaria', 'Diploastrea', 'Pavona', 'Leptastrea'
];

const SPECIES = {
    'Acropora': ['millepora', 'nobilis', 'hyacinthus', 'cervicornis', 'tenuis', 'selago'],
    'Porites': ['cylindrica', 'lobata', 'lutea', 'australiensis', 'murrayensis'],
    'Montipora': ['digitata', 'capitata', 'angulata', 'foliosa', 'tuberculosa'],
    'Stylophora': ['pistillata', 'mamillata', 'densescens'],
    'Pocillopora': ['verrucosa', 'damicornis', 'eydouxi', 'meandrina'],
    'Seriatopora': ['hystrix', 'catenata'],
    'Favites': ['abdita', 'spinosa', 'flexuosa', 'chinensis'],
    'Goniastrea': ['retiformis', 'pectinata', 'aspera', 'stelligera'],
    'Platygyra': ['daedalea', 'sinensis', 'ryukyuensis'],
    'Cyphastrea': ['serailia', 'microphthalma', 'chalcidicum'],
    'Echinopora': ['lamellosa', 'horsfieldii', 'gemmacea'],
    'Galaxea': ['fascicularis', 'lacustris'],
    'Hydnophora': ['exesa', 'microconos'],
    'Merulina': ['ampliata', 'scabricula'],
    'Turbinaria': ['peltata', 'reniformis', 'mesenterina'],
    'Pavona': ['cactus', 'clavus', 'varians'],
    'Leptastrea': ['purpurea', 'transversa', 'cwrottoni'],
    'Diploastrea': ['heliopora'],
    'Millepora': ['alcicornis', 'squarrosa', 'tenuis'],
    'Montastraea': ['cavernosa']
};

const LOCATIONS = [
    'Great Barrier Reef, Australia', 'Ningaloo Reef, Australia',
    'Nanumea, Tuvalu', 'Funafuti, Tuvalu', 'Suva Reef, Fiji',
    'Raja Ampat, Indonesia', 'Komodo, Indonesia', 'Bunaken, Indonesia',
    'Tubbataha, Philippines', 'Apo Reef, Philippines',
    'Palau Blue Corner', 'Chuuk Lagoon, Micronesia',
    'Kwajalein Atoll, Marshall Islands', 'Majuro, Marshall Islands',
    'American Samoa', 'Tongareva, Cook Islands',
    'Moorea, French Polynesia', 'Rangiroa, French Polynesia',
    'Maldives North Male Atoll', 'Maldives Ari Atoll',
    'Seychelles Aldabra', 'Mayotte, France',
    'Heron Island, Australia', 'Lizard Island, Australia',
    'Orpheus Island, Australia', 'Davies Reef, Australia',
    'Kimbe Bay, Papua New Guinea', 'Milne Bay, Papua New Guinea',
    'New Caledonia, France', 'Lord Howe Island, Australia'
];

const GAMETE_OPTIONS = ['Sperm', 'Eggs', 'Bundle'];
const SITUATION_OPTIONS = ['In situ', 'Ex situ'];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate() {
    const year = 2018 + Math.floor(Math.random() * 7);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function randomTime() {
    const h = String(19 + Math.floor(Math.random() * 5)).padStart(2, '0');
    const m = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `${h}:${m}`;
}

function generateSeedData(centerLat, centerLon, count, radiusKm) {
    const records = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.random() * radiusKm;
        const dLat = (dist / 111) * Math.cos(angle);
        const dLon = (dist / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
        const lat = centerLat + dLat;
        const lon = centerLon + dLon;
        const genus = randomChoice(GENUSES);
        const speciesList = SPECIES[genus] || ['sp.'];
        records.push({
            genus: genus,
            species: randomChoice(speciesList),
            location: randomChoice(LOCATIONS),
            latitude: Math.round(lat * 10000) / 10000,
            longitude: Math.round(lon * 10000) / 10000,
            date: randomDate(),
            start_time: randomTime(),
            end_time: randomTime(),
            days_after_full_moon: Math.floor(Math.random() * 6),
            gamete_release: randomChoice(GAMETE_OPTIONS),
            situation: randomChoice(SITUATION_OPTIONS),
            timezone: '',
            reference: 'Debug seed data',
            image_url: '',
            submitted_by: 'debugger'
        });
    }
    return records;
}

function renderTable(submissions) {
    const tbody = document.getElementById('submissions-tbody');
    const totalCount = document.getElementById('total-count');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    const totalPages = Math.max(1, Math.ceil(submissions.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PER_PAGE;
    const page = submissions.slice(start, start + PER_PAGE);

    totalCount.textContent = `(${submissions.length} total)`;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} — showing ${page.length} of ${submissions.length}`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    tbody.innerHTML = '';
    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted py-4">No submissions found</td></tr>';
        return;
    }

    page.forEach((sub, idx) => {
        const tr = document.createElement('tr');
        const timeStr = sub.start_time && sub.end_time
            ? `${sub.start_time}–${sub.end_time}`
            : sub.start_time || sub.end_time || '';
        const submittedAt = sub.submitted_at
            ? new Date(sub.submitted_at).toLocaleString()
            : '';
        tr.innerHTML = `
            <td>${start + idx + 1}</td>
            <td><em>${sub.genus}</em></td>
            <td><em>${sub.species}</em></td>
            <td title="${sub.location}">${sub.location}</td>
            <td class="coord-cell">${Number(sub.latitude).toFixed(4)}</td>
            <td class="coord-cell">${Number(sub.longitude).toFixed(4)}</td>
            <td>${sub.date}</td>
            <td>${timeStr}</td>
            <td>${sub.days_after_full_moon != null ? sub.days_after_full_moon : ''}</td>
            <td>${sub.gamete_release || ''}</td>
            <td>${sub.submitted_by || ''}</td>
            <td title="${sub.submitted_at || ''}">${submittedAt}</td>
            <td><button class="btn btn-outline-danger action-btn delete-btn" data-id="${sub.id}"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async function () {
            const id = this.getAttribute('data-id');
            if (!confirm('Delete this submission?')) return;
            const resp = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
            const body = await resp.json();
            if (body.success) loadSubmissions();
            else alert('Delete failed: ' + (body.error || 'unknown'));
        };
    });
}

async function loadSubmissions() {
    try {
        const resp = await fetch('/api/submissions');
        const body = await resp.json();
        if (body.success) {
            renderTable(body.submissions);
        }
    } catch (e) {
        console.error('Failed to load submissions:', e);
    }
}

function setStatus(msg, type) {
    const el = document.getElementById('action-status');
    el.className = `mt-2 text-${type}`;
    el.textContent = msg;
}

document.addEventListener('DOMContentLoaded', function () {
    const lat = parseFloat(document.getElementById('debug-lat').value);
    const lon = parseFloat(document.getElementById('debug-lon').value);

    map = L.map('debug-map').setView([lat, lon], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    marker.on('dragend', function () {
        const pos = marker.getLatLng();
        document.getElementById('debug-lat').value = pos.lat.toFixed(4);
        document.getElementById('debug-lon').value = pos.lng.toFixed(4);
    });

    map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        document.getElementById('debug-lat').value = e.latlng.lat.toFixed(4);
        document.getElementById('debug-lon').value = e.latlng.lng.toFixed(4);
    });

    document.getElementById('debug-lat').addEventListener('change', syncMarker);
    document.getElementById('debug-lon').addEventListener('change', syncMarker);

    document.getElementById('seed-btn').onclick = async function () {
        const centerLat = parseFloat(document.getElementById('debug-lat').value);
        const centerLon = parseFloat(document.getElementById('debug-lon').value);
        const count = parseInt(document.getElementById('seed-count').value) || 100;
        const radius = parseFloat(document.getElementById('seed-radius').value) || 50;
        const records = generateSeedData(centerLat, centerLon, count, radius);

        this.disabled = true;
        setStatus('Seeding...', 'warning');
        try {
            const resp = await fetch('/api/debug/seed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissions: records })
            });
            const body = await resp.json();
            if (body.success) {
                setStatus(`Seeded ${body.count} records`, 'success');
                currentPage = 1;
                loadSubmissions();
            } else {
                setStatus('Seed failed: ' + body.error, 'danger');
            }
        } catch (e) {
            setStatus('Seed failed: ' + e.message, 'danger');
        } finally {
            this.disabled = false;
        }
    };

    document.getElementById('clear-btn').onclick = async function () {
        if (!confirm('Clear ALL user submissions? This cannot be undone.')) return;
        this.disabled = true;
        setStatus('Clearing...', 'warning');
        try {
            const resp = await fetch('/api/debug/clear', { method: 'POST' });
            const body = await resp.json();
            if (body.success) {
                setStatus('All submissions cleared', 'success');
                currentPage = 1;
                loadSubmissions();
            } else {
                setStatus('Clear failed: ' + body.error, 'danger');
            }
        } catch (e) {
            setStatus('Clear failed: ' + e.message, 'danger');
        } finally {
            this.disabled = false;
        }
    };

    document.getElementById('prev-btn').onclick = function () {
        if (currentPage > 1) { currentPage--; loadSubmissions(); }
    };
    document.getElementById('next-btn').onclick = function () {
        currentPage++;
        loadSubmissions();
    };

    loadSubmissions();
});

function syncMarker() {
    const lat = parseFloat(document.getElementById('debug-lat').value);
    const lon = parseFloat(document.getElementById('debug-lon').value);
    if (!isNaN(lat) && !isNaN(lon)) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], map.getZoom());
    }
}
