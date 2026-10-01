# Downtown Honolulu Parking Map

A web application that allows users to navigate an interactive map and view information on parking rates in downtown Honolulu.

## Features

- **Interactive Map**: Powered by Leaflet with OpenStreetMap tiles
- **Price Markers**: Each spot shows its hourly rate on the map, color-coded by price
- **Smart Filtering**: Filter by price, monthly availability, hours, height restrictions, and garage type
- **Sorted List**: All spots listed cheapest first, linked to the map
- **Responsive Design**: List sidebar on desktop, draggable bottom sheet on mobile
- **Accessibility**: Full keyboard navigation and screen reader support
- **Location Details**: Comprehensive parking information including rates, hours, and contact details
- **Directions and Calling**: One tap to Google Maps directions or to call the operator

## Design

- **Map-first layout**: Clean white surfaces and a muted basemap so prices stand out
- **Consistent Typography**: Poppins font family throughout the entire application
- **Price tiers**: Green for $3/hr or less, amber for $5/hr or less, red above that
- **Visual Feedback**: Selected and hovered spots are highlighted on both the map and the list

## Technologies

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Mapping**: Leaflet.js
- **Styling**: CSS Custom Properties, Flexbox, CSS Grid
- **Performance**: Data caching, optimized DOM operations
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Project Structure

```
├── index.html              # Main HTML file
├── app.js                  # JavaScript application logic
├── style.css               # Stylesheet
├── data/
│   └── parking.geojson     # Parking location data
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jacobrg808/honolulu-parking.git
   cd honolulu-parking
   ```

2. **Start a local server**
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**
   Navigate to `http://localhost:8000`

### Deployment

This is a static web application that can be deployed to any web hosting service:

- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Enable Pages in repository settings
- **Traditional hosting**: Upload files to your web server

## Usage

### Filtering Locations

Use the filter chips at the top to narrow down parking options:

- **Price Filters**: "$3/hr or less" or "$5/hr or less" (based on the regular hourly rate)
- **Monthly Parking**: Show only locations with monthly options
- **24/7 Access**: Filter for round-the-clock availability
- **Height Restrictions**: Find locations with no height limits
- **Garage Type**: Show only covered parking garages

### Viewing Details

- **Click any price marker** or list row to view detailed information
- **On mobile**, drag the sheet handle up or down, or tap it to expand; tap the map to lower it
- **Directions** opens Google Maps for turn-by-turn navigation

### Keyboard Navigation

- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and filters
- **Escape**: Close the detail view (or lower the sheet on mobile)

## Customization

### Adding New Locations

Edit `data/parking.geojson` to add new parking locations:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-157.8583, 21.3069]
  },
  "properties": {
    "name": "Parking Location Name",
    "address": "123 Main St, Honolulu, HI",
    "rates": "$2/hour first 2 hours, $4/hour thereafter",
    "hours": "Mon-Fri 6am-6pm",
    "monthly": "$250 monthly permit",
    "height": "6'8\"",
    "type": "Garage",
    "phone": "808-555-0123",
    "hourly_rate": 4,
    "monthly_available": true,
    "open_24_7": false,
    "clearance_in": 80,
    "garage": true
  }
}
```

The text fields (`rates`, `hours`, `monthly`, `height`, `type`, `phone`) are shown on the info card as written. The filters use only the structured fields:

| Field | Type | Meaning |
|-------|------|---------|
| `hourly_rate` | number or `null` | Regular hourly rate, not an introductory first-hour rate. Convert half-hour or 20-minute prices to per hour. `null` if no rate is published (e.g. "Varies"); these match every price filter. |
| `monthly_available` | boolean | Monthly parking is open to the public (not tenants or employees only) |
| `open_24_7` | boolean | Public parking available around the clock |
| `clearance_in` | number or `null` | Height clearance in inches; `null` means no height limit |
| `garage` | boolean | Covered garage rather than an open lot |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Hawaii Business Magazine**: Parking information (https://www.hawaiibusiness.com/the-downtown-honolulu-parking-guide-returns-with-new-updates/)
- **OpenStreetMap**: Map data and tiles
- **Leaflet**: Interactive mapping library
- **Poppins Font**: Typography by Google Fonts

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/jacobrg808/honolulu-parking/issues) page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

---

**Made with care for the Honolulu community**