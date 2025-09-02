// Initialize map centered on downtown Honolulu with canvas rendering for better performance
const map = L.map('map', { preferCanvas: true }).setView([21.3069, -157.8583], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Use marker clustering to handle overlapping markers at lower zoom levels
const markers = L.markerClusterGroup();
// Cache parking data to avoid re-fetching during filter operations
let parkingData = null;

/**
 * Load parking data from GeoJSON file and initialize map markers
 * Caches data globally for efficient filtering operations
 */
async function loadParking() {
    try {
        const res = await fetch('data/parking.geojson');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const geo = await res.json();
        parkingData = geo; // Cache for filter operations

        // Convert GeoJSON features to interactive Leaflet markers
        L.geoJSON(geo, {
            pointToLayer: (feature, latlng) => {
                const m = L.marker(latlng);
                m.feature = feature; // Preserve feature data for click handlers
                return m;
            },
            onEachFeature: (feature, layer) => {
                layer.on('click', () => showCard(feature.properties, layer.getLatLng()));
            }
        }).eachLayer(l => markers.addLayer(l));
        map.addLayer(markers);
        buildList(geo.features);
        updateResetButton(); // Initialize button state
    } catch (error) {
        console.error('Error loading parking data:', error);
        document.getElementById('cardContent').innerHTML = '<p style="color: red;">Error loading parking data. Please refresh the page.</p>';
    }
}

// Initialize when DOM is ready
document.readyState === 'loading' ?
    document.addEventListener('DOMContentLoaded', loadParking) : loadParking();

const card = document.getElementById('cardContent');

/**
 * Display parking location details in the info card or mobile modal
 * @param {Object} p - Parking properties from GeoJSON
 * @param {Object} latlng - Coordinates for map centering
 */
function showCard(p, latlng) {
    const cardHTML = `
        <h3 class="location-title">${escapeHtml(p.name || 'Untitled')}</h3>
        <div class="meta">${escapeHtml(p.address || '')}</div>
        <div class="rate">${escapeHtml(p.rates || 'Rates N/A')}</div>
        <div class="meta">Hours: ${escapeHtml(p.hours || 'N/A')}</div>
        <div class="meta">Monthly: ${escapeHtml(p.monthly || 'N/A')}</div>
        <div class="meta">Height: ${escapeHtml(p.height || 'N/A')}</div>
        <div class="meta">Type: ${escapeHtml(p.type || 'N/A')}</div>
        <div class="meta phone">Phone: ${escapeHtml(p.phone || '')}</div>
        <div class="card-actions">
            <button class="btn-primary" onclick="centerTo(${latlng.lat}, ${latlng.lng})">Center Map</button>
            <a class="btn-primary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address || '')}" >Google Maps</a>
        </div>`;
    
    if (isMobile()) {
        // Show in mobile modal
        mobileCardContent.innerHTML = cardHTML;
        mobileCardModal.classList.remove('hidden');
        closeMobileCard.focus();
    } else {
        // Show in desktop sidebar
        card.innerHTML = cardHTML;
    }
}

// Center map on specific location with higher zoom for detail
function centerTo(lat, lng) { map.setView([lat, lng], 17); }

// Sanitize user content to prevent XSS attacks
function escapeHtml(s) {
    return !s ? '' : s.toString().replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// Modal functionality for mobile users and accessibility
const listToggle = document.getElementById('listToggle');
const listModal = document.getElementById('listModal');
const closeList = document.getElementById('closeList');
const listContainer = document.getElementById('listContainer');
const mobileCardModal = document.getElementById('mobileCardModal');
const closeMobileCard = document.getElementById('closeMobileCard');
const mobileCardContent = document.getElementById('mobileCardContent');

// Check if we're on mobile
function isMobile() {
    return window.innerWidth <= 900;
}

listToggle.addEventListener('click', () => {
    listModal.classList.remove('hidden');
    closeList.focus(); // Accessibility: focus management for screen readers
});
closeList.addEventListener('click', () => listModal.classList.add('hidden'));
closeMobileCard.addEventListener('click', () => mobileCardModal.classList.add('hidden'));

// Allow Escape key to close modals for better UX
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!listModal.classList.contains('hidden')) {
            listModal.classList.add('hidden');
        }
        if (!mobileCardModal.classList.contains('hidden')) {
            mobileCardModal.classList.add('hidden');
        }
    }
});

function buildList(features) {
    listContainer.innerHTML = '';
    features.forEach(f => {
        const p = f.properties;
        const coords = f.geometry.coordinates;
        const latlng = [coords[1], coords[0]]; // Convert to Leaflet format once

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <div class="name">${escapeHtml(p.name)}</div>
                <div class="addr">${escapeHtml(p.address)}</div>
            </div>
            <div class="list-item-right">
                <div class="rate">${escapeHtml(p.rates || '')}</div>
                <div class="meta">${escapeHtml(p.monthly || '')}</div>
            </div>`;

        div.addEventListener('click', () => {
            map.setView(latlng, 17);
            showCard(p, { lat: latlng[0], lng: latlng[1] });
            listModal.classList.add('hidden');
        });
        listContainer.appendChild(div);
    });
}

// Chip-based filtering system - more intuitive than dropdowns for mobile users
const filterChips = document.querySelectorAll('.chip');
const resetFilters = document.getElementById('resetFilters');
let activeFilters = new Set(); // Use Set for O(1) lookup performance

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const filterId = `${chip.dataset.filter}:${chip.dataset.value}`;
        // Toggle filter state
        if (chip.classList.contains('active')) {
            chip.classList.remove('active');
            activeFilters.delete(filterId);
        } else {
            chip.classList.add('active');
            activeFilters.add(filterId);
        }
        applyFilters();
        updateResetButton();
    });
});

resetFilters.addEventListener('click', () => {
    filterChips.forEach(chip => chip.classList.remove('active'));
    activeFilters.clear();
    applyFilters();
    updateResetButton();
});

// Update reset button state based on filter state
function updateResetButton() {
    const hasActiveFilters = activeFilters.size > 0;
    resetFilters.style.opacity = hasActiveFilters ? '1' : '0.6';
    resetFilters.title = hasActiveFilters ? 'Clear all filters' : 'No filters active';
}

/**
 * Apply active filters to parking data and update map/list
 * Uses cached data to avoid re-fetching on each filter change
 */
function applyFilters() {
    if (!parkingData) return; // Wait for initial data load

    const features = parkingData.features.filter(f => {
        const p = f.properties;
        // Check if location passes all active filters
        for (const filterId of activeFilters) {
            const [filterType, filterValue] = filterId.split(':');
            switch (filterType) {
                case 'price':
                    // Extract first dollar amount from rate string (basic parsing)
                    const priceMatch = (p.rates || '').match(/\$([0-9]+(?:\.[0-9]+)?)/);
                    if (priceMatch && Number(priceMatch[1]) > Number(filterValue)) return false;
                    break;
                case 'monthly':
                    if (filterValue === 'yes' && !/monthly|permit|available/i.test(p.monthly || '')) return false;
                    break;
                case 'hours':
                    if (filterValue === '24/7' && !/24\/7|24 hours/i.test(p.hours || '')) return false;
                    break;
                case 'height':
                    if (filterValue === 'no-limit' && !/no height|open lot|no restrictions/i.test(p.height || '')) return false;
                    break;
                case 'type':
                    if (filterValue === 'garage' && !/garage/i.test(p.type || '')) return false;
                    break;
            }
        }
        return true;
    });

    // Update map markers with filtered results
    markers.clearLayers();
    features.forEach(f => {
        const coords = f.geometry.coordinates;
        const latlng = [coords[1], coords[0]]; // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
        const mk = L.marker(latlng);
        mk.feature = f;
        mk.on('click', () => showCard(f.properties, { lat: latlng[0], lng: latlng[1] }));
        markers.addLayer(mk);
    });
    buildList(features); // Update list modal as well
}