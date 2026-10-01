// Initialize map centered on downtown Honolulu with canvas rendering for better performance
const map = L.map('map', { preferCanvas: true }).setView([21.3069, -157.8583], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Use marker clustering to handle overlapping markers at lower zoom levels
const markers = L.markerClusterGroup();
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

        map.addLayer(markers);
        render(geo.features);
        updateResetButton(); // Initialize button state
    } catch (error) {
        console.error('Error loading parking data:', error);
        document.getElementById('cardContent').innerHTML = '<p style="color: red;">Error loading parking data. Please refresh the page.</p>';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadParking);
} else {
    loadParking();
}

const card = document.getElementById('cardContent');
const cardHint = card.innerHTML;
let selectedFeature = null; // Location shown in the desktop info card

/**
 * Render markers and the list for the given features
 * GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
 */
function render(features) {
    markers.clearLayers();
    features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates;
        const mk = L.marker([lat, lng]);
        mk.on('click', () => showCard(f));
        markers.addLayer(mk);
    });
    buildList(features);

    // Clear the desktop card if its location was filtered out
    if (selectedFeature && !features.includes(selectedFeature)) {
        selectedFeature = null;
        card.innerHTML = cardHint;
    }
}

/**
 * Display parking location details in the info card or mobile modal
 * @param {Object} f - GeoJSON feature
 */
function showCard(f) {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    // Coordinates are unambiguous; addresses lack a city and can resolve elsewhere
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const detailsHTML = `
        <h3 class="location-title">${escapeHtml(p.name || 'Untitled')}</h3>
        <div class="meta">${escapeHtml(p.address || '')}</div>
        <div class="rate">${escapeHtml(p.rates || 'Rates N/A')}</div>
        <div class="meta">Hours: ${escapeHtml(p.hours || 'N/A')}</div>
        <div class="meta">Monthly: ${escapeHtml(p.monthly || 'N/A')}</div>
        <div class="meta">Height: ${escapeHtml(p.height || 'N/A')}</div>
        <div class="meta">Type: ${escapeHtml(p.type || 'N/A')}</div>
        <div class="meta phone">Phone: ${escapeHtml(p.phone || '')}</div>`;
    
    if (isMobile()) {
        // Mobile: Only show Google Maps button (no center map button)
        const mobileHTML = detailsHTML + `
        <div class="card-actions">
            <a class="btn-primary" target="_blank" rel="noopener" href="${mapsUrl}">Google Maps</a>
        </div>`;
        mobileCardContent.innerHTML = mobileHTML;
        mobileCardModal.classList.remove('hidden');
        closeMobileCard.focus();
    } else {
        // Desktop: Show both buttons
        const desktopHTML = detailsHTML + `
        <div class="card-actions">
            <button class="btn-primary" id="centerMap">Center Map</button>
            <a class="btn-primary" target="_blank" rel="noopener" href="${mapsUrl}">Google Maps</a>
        </div>`;
        card.innerHTML = desktopHTML;
        selectedFeature = f;
        document.getElementById('centerMap').addEventListener('click', () => centerTo(lat, lng));
    }
}

// Center map on specific location with higher zoom for detail
function centerTo(lat, lng) { map.setView([lat, lng], 17); }

// Sanitize user content to prevent XSS attacks
function escapeHtml(s) {
    if (!s) return '';
    const escapeMap = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    };
    return s.toString().replace(/[&<>"']/g, c => escapeMap[c]);
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
    const fragment = document.createDocumentFragment();
    
    features.forEach(f => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;

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
            centerTo(lat, lng);
            showCard(f);
            listModal.classList.add('hidden');
        });
        fragment.appendChild(div);
    });
    
    listContainer.innerHTML = '';
    listContainer.appendChild(fragment);
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
                    // Locations without a published hourly rate never match a price filter
                    if (p.hourly_rate == null || p.hourly_rate > Number(filterValue)) return false;
                    break;
                case 'monthly':
                    if (!p.monthly_available) return false;
                    break;
                case 'hours':
                    if (!p.open_24_7) return false;
                    break;
                case 'height':
                    if (p.clearance_in != null) return false; // null means no height limit
                    break;
                case 'type':
                    if (!p.garage) return false;
                    break;
            }
        }
        return true;
    });

    render(features);
}
