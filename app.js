// Initialize map centered on downtown Honolulu
const map = L.map('map', { zoomControl: true }).setView([21.3069, -157.8583], 15);
// Tiles are muted in style.css so the price markers stand out
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const markerByFeature = new Map();
const rowByFeature = new Map();
let parkingData = null;
let selectedFeature = null;

const panel = document.getElementById('panel');
const sheetHandle = document.getElementById('sheetHandle');
const listView = document.getElementById('listView');
const listContainer = document.getElementById('listContainer');
const detailView = document.getElementById('detailView');
const resultCount = document.getElementById('resultCount');
const emptyState = document.getElementById('emptyState');

// Must match the mobile breakpoint and peek height in style.css
const mobileQuery = window.matchMedia('(max-width: 900px)');
const PEEK_FRACTION = 0.45;

function isMobile() {
    return mobileQuery.matches;
}

// Keep the map attribution visible above the bottom sheet on mobile
function placeAttribution() {
    map.attributionControl.setPosition(isMobile() ? 'topright' : 'bottomright');
}
placeAttribution();
mobileQuery.addEventListener('change', placeAttribution);

/**
 * Load parking data from GeoJSON file and initialize map markers
 * Caches data globally for efficient filtering operations
 */
async function loadParking() {
    try {
        const res = await fetch('data/parking.geojson');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        parkingData = await res.json();
        render(parkingData.features);
        fitToFeatures(parkingData.features);
    } catch (error) {
        console.error('Error loading parking data:', error);
        listContainer.innerHTML = '<li class="load-error">Error loading parking data. Please refresh the page.</li>';
    }
}

loadParking();

// Sanitize user content to prevent XSS attacks
function escapeHtml(s) {
    if (!s) return '';
    const escapeMap = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    };
    return s.toString().replace(/[&<>"']/g, c => escapeMap[c]);
}

// Price tiers line up with the filter chips: $3 or less, $5 or less, more
function priceTier(rate) {
    if (rate == null) return 'tier-unknown';
    if (rate <= 3) return 'tier-low';
    if (rate <= 5) return 'tier-mid';
    return 'tier-high';
}

function priceLabel(rate) {
    if (rate == null) return 'Varies';
    return `$${Number.isInteger(rate) ? rate : rate.toFixed(2)}`;
}

function clearanceLabel(inches) {
    if (inches == null) return 'No height limit';
    return `${Math.floor(inches / 12)}'${inches % 12}" clearance`;
}

function coords(f) {
    const [lng, lat] = f.geometry.coordinates; // GeoJSON uses [lng, lat]
    return { lat, lng };
}

// Cheapest first; locations without a published rate go last
function byPrice(a, b) {
    const ra = a.properties.hourly_rate ?? Infinity;
    const rb = b.properties.hourly_rate ?? Infinity;
    return ra - rb || a.properties.name.localeCompare(b.properties.name);
}

/**
 * Render price markers, the list, and the result count for the given features
 */
function render(features) {
    const sorted = [...features].sort(byPrice);

    markerLayer.clearLayers();
    markerByFeature.clear();
    sorted.forEach(f => {
        const p = f.properties;
        const icon = L.divIcon({
            className: 'price-pin-anchor',
            html: `<span class="price-pin ${priceTier(p.hourly_rate)}">${priceLabel(p.hourly_rate)}</span>`,
            iconSize: null
        });
        const mk = L.marker(coords(f), { icon, title: p.name, riseOnHover: true });
        mk.on('click', () => select(f));
        markerLayer.addLayer(mk);
        markerByFeature.set(f, mk);
    });

    buildList(sorted);
    resultCount.textContent = `${sorted.length} ${sorted.length === 1 ? 'spot' : 'spots'}`;
    emptyState.hidden = sorted.length > 0;

    if (selectedFeature) {
        if (features.includes(selectedFeature)) setMarkerState(selectedFeature, 'selected', true);
        else closeDetail();
    }
}

function fitToFeatures(features) {
    if (!features.length) return;
    const bounds = L.latLngBounds(features.map(coords));
    const bottom = isMobile() ? window.innerHeight * PEEK_FRACTION : 0;
    map.fitBounds(bounds, { paddingTopLeft: [24, 24], paddingBottomRight: [24, bottom + 24] });
}

function buildList(features) {
    const fragment = document.createDocumentFragment();
    rowByFeature.clear();

    features.forEach(f => {
        const p = f.properties;
        const tags = [p.open_24_7 && '24/7', p.monthly_available && 'Monthly', p.garage ? 'Garage' : 'Lot']
            .filter(Boolean).join(' · ');

        const li = document.createElement('li');
        li.innerHTML = `
            <button type="button" class="spot-row">
                <span class="row-main">
                    <span class="row-name">${escapeHtml(p.name)}</span>
                    <span class="row-addr">${escapeHtml(p.address)}</span>
                    <span class="row-tags">${tags}</span>
                </span>
                <span class="row-price ${priceTier(p.hourly_rate)}">${priceLabel(p.hourly_rate)}${p.hourly_rate == null ? '' : '<small>/hr</small>'}</span>
            </button>`;
        const row = li.firstElementChild;
        row.addEventListener('click', () => select(f));
        row.addEventListener('mouseenter', () => setMarkerState(f, 'hover', true));
        row.addEventListener('mouseleave', () => setMarkerState(f, 'hover', false));
        rowByFeature.set(f, row);
        fragment.appendChild(li);
    });

    listContainer.replaceChildren(fragment);
}

// Toggle a highlight class on a marker's price pin and raise it above neighbors
function setMarkerState(f, cls, on) {
    const mk = markerByFeature.get(f);
    const pin = mk?.getElement()?.querySelector('.price-pin');
    if (!pin) return;
    pin.classList.toggle(cls, on);
    const raised = pin.classList.contains('selected') || pin.classList.contains('hover');
    mk.setZIndexOffset(raised ? 1000 : 0);
}

/**
 * Show a location's details in the panel and center it on the map
 */
function select(f) {
    if (selectedFeature) setMarkerState(selectedFeature, 'selected', false);
    selectedFeature = f;
    setMarkerState(f, 'selected', true);

    detailView.innerHTML = detailHTML(f);
    detailView.querySelector('.back-button').addEventListener('click', closeDetail);
    listView.hidden = true;
    detailView.hidden = false;
    panel.querySelector('.panel-body').scrollTop = 0;

    if (isMobile()) setSheetState('peek');
    centerOn(f);
}

function closeDetail() {
    const f = selectedFeature;
    if (f) setMarkerState(f, 'selected', false);
    selectedFeature = null;
    detailView.hidden = true;
    listView.hidden = false;

    // Return to the row the user came from
    const row = f && rowByFeature.get(f);
    if (row) {
        row.scrollIntoView({ block: 'nearest' });
        row.focus({ preventScroll: true });
    }
}

// On mobile, offset the center so the pin sits above the bottom sheet
function centerOn(f) {
    const zoom = Math.max(map.getZoom(), 16);
    let target = L.latLng(coords(f));
    if (isMobile()) {
        const offset = window.innerHeight * PEEK_FRACTION / 2;
        target = map.unproject(map.project(target, zoom).add([0, offset]), zoom);
    }
    map.flyTo(target, zoom, { duration: 0.5 });
}

function detailHTML(f) {
    const p = f.properties;
    const { lat, lng } = coords(f);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const phoneDigits = (p.phone || '').replace(/\D/g, '');

    const badges = [
        p.open_24_7 && '24/7',
        p.monthly_available && 'Monthly parking',
        clearanceLabel(p.clearance_in),
        p.garage ? 'Garage' : 'Open lot'
    ].filter(Boolean).map(b => `<li>${escapeHtml(b)}</li>`).join('');

    const rows = [
        ['Rates', p.rates], ['Hours', p.hours], ['Monthly', p.monthly], ['Height', p.height], ['Type', p.type]
    ].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');

    const price = p.hourly_rate == null
        ? '<div class="detail-price tier-unknown">Rates vary</div>'
        : `<div class="detail-price ${priceTier(p.hourly_rate)}">${priceLabel(p.hourly_rate)}<span>/hr</span></div>`;

    return `
        <button type="button" class="back-button">‹ All spots</button>
        ${price}
        <h2 class="detail-name">${escapeHtml(p.name)}</h2>
        <p class="detail-addr">${escapeHtml(p.address)}</p>
        <ul class="badges">${badges}</ul>
        <div class="actions">
            <a class="btn btn-primary" target="_blank" rel="noopener" href="${directionsUrl}">Directions</a>
            ${phoneDigits ? `<a class="btn btn-secondary" href="tel:+1${phoneDigits}">Call</a>` : ''}
        </div>
        <dl class="detail-rows">${rows}</dl>`;
}

// Tapping empty map closes the detail view and lowers the sheet
map.on('click', () => {
    if (selectedFeature) closeDetail();
    if (isMobile()) setSheetState('collapsed');
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (selectedFeature) closeDetail();
    else if (isMobile()) setSheetState('collapsed');
});

/**
 * Mobile bottom sheet: collapsed (handle only), peek, or full
 * Drag the handle to resize; tap it to step up a size
 */
const SHEET_STATES = ['collapsed', 'peek', 'full'];

function setSheetState(state) {
    panel.dataset.state = state;
    panel.style.transform = '';
}

let drag = null;

sheetHandle.addEventListener('pointerdown', (e) => {
    if (!isMobile()) return;
    drag = { startY: e.clientY, startTop: panel.getBoundingClientRect().top, moved: false };
    panel.classList.add('dragging');
    sheetHandle.setPointerCapture(e.pointerId);
});

sheetHandle.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 6) drag.moved = true;
    const minTop = window.innerHeight - panel.offsetHeight;
    const maxTop = window.innerHeight - sheetHandle.offsetHeight;
    const top = Math.min(Math.max(drag.startTop + dy, minTop), maxTop);
    panel.style.transform = `translateY(${top - (window.innerHeight - panel.offsetHeight)}px)`;
});

sheetHandle.addEventListener('pointerup', (e) => {
    if (!drag) return;
    panel.classList.remove('dragging');
    const current = SHEET_STATES.indexOf(panel.dataset.state);
    if (!drag.moved) {
        // Tap: collapsed → peek → full → peek
        setSheetState(current === 2 ? 'peek' : SHEET_STATES[current + 1]);
    } else {
        // Snap to the nearest size
        const visible = window.innerHeight - panel.getBoundingClientRect().top;
        const snaps = sheetSnapHeights();
        const nearest = snaps.reduce((best, h, i) => Math.abs(h - visible) < Math.abs(snaps[best] - visible) ? i : best, 0);
        setSheetState(SHEET_STATES[nearest]);
    }
    drag = null;
});

sheetHandle.addEventListener('pointercancel', () => {
    if (!drag) return;
    panel.classList.remove('dragging');
    setSheetState(panel.dataset.state);
    drag = null;
});

// Visible heights for each sheet state, matching style.css
function sheetSnapHeights() {
    return [sheetHandle.offsetHeight, window.innerHeight * PEEK_FRACTION, panel.offsetHeight];
}

// Chip-based filtering system
const filterChips = document.querySelectorAll('.chip[data-filter]');
const resetFilters = document.getElementById('resetFilters');
let activeFilters = new Set(); // Use Set for O(1) lookup performance

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const filterId = `${chip.dataset.filter}:${chip.dataset.value}`;
        const on = !activeFilters.has(filterId);
        if (on) activeFilters.add(filterId);
        else activeFilters.delete(filterId);
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', on);
        applyFilters();
    });
});

function clearFilters() {
    filterChips.forEach(chip => {
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
    });
    activeFilters.clear();
    applyFilters();
}

resetFilters.addEventListener('click', clearFilters);
document.getElementById('emptyReset').addEventListener('click', clearFilters);

/**
 * Apply active filters to parking data and update map/list
 * Uses cached data to avoid re-fetching on each filter change
 */
function applyFilters() {
    resetFilters.hidden = activeFilters.size === 0;
    if (!parkingData) return; // Wait for initial data load

    const features = parkingData.features.filter(f => {
        const p = f.properties;
        // Check if location passes all active filters
        for (const filterId of activeFilters) {
            const [filterType, filterValue] = filterId.split(':');
            switch (filterType) {
                case 'price':
                    // Locations without a published hourly rate (e.g. "Varies") match every price filter
                    if (p.hourly_rate != null && p.hourly_rate > Number(filterValue)) return false;
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
