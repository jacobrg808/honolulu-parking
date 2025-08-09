// app.js
// Assumes Leaflet and MarkerCluster are loaded (see index.html)

// Initialize map
const map = L.map('map', { preferCanvas: true }).setView([21.3069, -157.8583], 15);

// Add OSM tiles (no API key)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Initialize marker clustering for better map performance
const markers = L.markerClusterGroup();

// Cache the parking data
let parkingData = null;

// Load parking data and initialize map markers
async function loadParking() {
    try {
        const res = await fetch('data/parking.geojson');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const geo = await res.json();
        parkingData = geo; // Cache the data

        // Create interactive markers from GeoJSON data
        L.geoJSON(geo, {
            pointToLayer: (feature, latlng) => {
                const m = L.marker(latlng);
                m.feature = feature; // keep reference
                return m;
            },
            onEachFeature: (feature, layer) => {
                layer.on('click', () => showCard(feature.properties, layer.getLatLng()));
            }
        }).eachLayer(l => markers.addLayer(l));
        map.addLayer(markers);
        buildList(geo.features);
    } catch (error) {
        console.error('Error loading parking data:', error);
        document.getElementById('cardContent').innerHTML = '<p style="color: red;">Error loading parking data. Please refresh the page.</p>';
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadParking);
} else {
    loadParking();
}

// Parking details card functionality
const card = document.getElementById('cardContent');
function showCard(p, latlng) {
    const html = `
    <h3 class="location-title">${escapeHtml(p.name || 'Untitled')}</h3>
    <div class="meta">${escapeHtml(p.address || '')}</div>
    <div class="rate">${escapeHtml(p.rates || 'Rates N/A')}</div>
    <div class="meta">Hours: ${escapeHtml(p.hours || 'N/A')}</div>
    <div class="meta">Monthly: ${escapeHtml(p.monthly || 'N/A')}</div>
    <div class="meta">Height: ${escapeHtml(p.height || 'N/A')}</div>
    <div class="meta">Type: ${escapeHtml(p.type || 'N/A')}</div>
    <div class="meta phone">Phone: ${escapeHtml(p.phone || '')}</div>
    <div class="card-actions">
      <button class="btn-primary" onclick="centerTo(${latlng.lat}, ${latlng.lng})">📍 Center Map</button>
      <a class="btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address || '')}" >🗺️ Google Maps</a>
    </div>
  `;
    card.innerHTML = html;
}

// Center map on specific coordinates with higher zoom
function centerTo(lat, lng) {
    map.setView([lat, lng], 17);
}

// Sanitize HTML content to prevent XSS attacks
function escapeHtml(s) { if (!s) return ''; return s.toString().replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

// Modal list functionality for mobile/accessibility
const listToggle = document.getElementById('listToggle');
const listModal = document.getElementById('listModal');
const closeList = document.getElementById('closeList');
const listContainer = document.getElementById('listContainer');

listToggle.addEventListener('click', () => {
    listModal.classList.remove('hidden');
    closeList.focus(); // Focus management for accessibility
});

closeList.addEventListener('click', () => listModal.classList.add('hidden'));

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !listModal.classList.contains('hidden')) {
        listModal.classList.add('hidden');
    }
});

function buildList(features) {
    listContainer.innerHTML = '';
    features.forEach(f => {
        const p = f.properties;
        const div = document.createElement('div');
        div.className = 'list-item';
        const left = document.createElement('div');
        left.innerHTML = `<div class="name">${escapeHtml(p.name)}</div><div class="addr">${escapeHtml(p.address)}</div>`;
        const right = document.createElement('div');
        right.innerHTML = `<div class="rate">${escapeHtml(p.rates || '')}</div><div class="meta">${escapeHtml(p.monthly || '')}</div>`;
        div.appendChild(left);
        div.appendChild(right);
        div.addEventListener('click', () => {
            // find corresponding marker and open
            const latlng = f.geometry.coordinates;
            map.setView([latlng[1], latlng[0]], 17);
            showCard(p, { lat: latlng[1], lng: latlng[0] });
            listModal.classList.add('hidden');
        });
        listContainer.appendChild(div);
    });
}

// Parking filter functionality (monthly availability and price)
const filterMonthly = document.getElementById('filterMonthly');
const priceMax = document.getElementById('priceMax');
const resetFilters = document.getElementById('resetFilters');

filterMonthly.addEventListener('change', applyFilters);
priceMax.addEventListener('change', applyFilters);
resetFilters.addEventListener('click', () => {
    filterMonthly.value = 'all'; priceMax.value = ''; applyFilters();
});

function applyFilters() {
    if (!parkingData) return; // Wait for data to load

    const features = parkingData.features.filter(f => {
        const p = f.properties;
        // Filter by monthly parking availability
        if (filterMonthly.value === 'yes' && !/monthly|monthly available|permit/i.test(p.monthly || '')) return false;
        if (filterMonthly.value === 'no' && /monthly|permit/i.test(p.monthly || '')) return false;
        // Filter by maximum hourly rate (basic parsing)
        const max = Number(priceMax.value || Infinity);
        if (max !== Infinity) {
            // Extract first dollar amount from rate string
            const text = p.rates || '';
            const m = text.match(/\$([0-9]+(?:\.[0-9]+)?)/);
            if (m) {
                const val = Number(m[1]);
                if (val > max) return false;
            }
        }
        return true;
    });

    // Update map markers based on filtered results
    markers.clearLayers();
    features.forEach(f => {
        const coords = f.geometry.coordinates;
        const mk = L.marker([coords[1], coords[0]]);
        mk.feature = f;
        mk.on('click', () => showCard(f.properties, { lat: coords[1], lng: coords[0] }));
        markers.addLayer(mk);
    });
}

// Address search functionality using OpenStreetMap Nominatim API
const searchBox = document.getElementById('searchBox');
let searchTimeout;

async function performSearch(query) {
    const originalPlaceholder = searchBox.placeholder;
    searchBox.placeholder = '🔍 Searching...';
    searchBox.disabled = true;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us&bounded=1&viewbox=-158.3,-21.2,-157.6,21.8`;
    try {
        const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const results = await r.json();
        if (results.length) {
            const first = results[0];
            map.setView([first.lat, first.lon], 17);
        } else {
            alert('No results found.');
        }
    } catch (err) {
        console.error(err);
        alert('Search failed; check network.');
    } finally {
        searchBox.placeholder = originalPlaceholder;
        searchBox.disabled = false;
    }
}

searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const q = searchBox.value.trim();
        if (!q) return;

        // Prevent duplicate search requests
        clearTimeout(searchTimeout);
        performSearch(q);
    }
});
