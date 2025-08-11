# Downtown Honolulu Parking Map

A web application that allows users to navigate an interactive map and view information on parking rates in downtown Honolulu.

## Features

- **Interactive Map**: Powered by Leaflet with OpenStreetMap tiles
- **Smart Filtering**: Filter by price, monthly availability, hours, height restrictions, and garage type
- **Marker Clustering**: Efficiently handles overlapping markers at different zoom levels
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support
- **Real-time Search**: Instant filtering without page reloads
- **Location Details**: Comprehensive parking information including rates, hours, and contact details
- **Google Maps Integration**: Direct links to Google Maps for navigation

## Design

- **Glassomorphism UI**: Modern frosted glass aesthetic with backdrop blur effects
- **Consistent Typography**: Poppins font family throughout the entire application
- **Smooth Animations**: Polished micro-interactions and hover effects
- **Visual Feedback**: Dynamic button states and filter indicators
- **Professional Color Scheme**: Carefully chosen colors for optimal readability

## Technologies

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Mapping**: Leaflet.js with MarkerCluster plugin
- **Styling**: CSS Custom Properties, Flexbox, CSS Grid
- **Performance**: Canvas rendering, data caching, optimized DOM operations
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Project Structure

```
├── index.html              # Main HTML file
├── app.js                  # JavaScript application logic
├── style.css               # Stylesheet with glassomorphism design
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
   git clone https://github.com/yourusername/honolulu-parking-map.git
   cd honolulu-parking-map
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

- **Price Filters**: "Under $3/hr" or "Under $5/hr"
- **Monthly Parking**: Show only locations with monthly options
- **24/7 Access**: Filter for round-the-clock availability
- **Height Restrictions**: Find locations with no height limits
- **Garage Type**: Show only covered parking garages

### Viewing Details

- **Click any marker** on the map to view detailed information
- **Use the list view** (mobile) to browse all locations
- **Center the map** on any location for a closer look
- **Open in Google Maps** for turn-by-turn navigation

### Keyboard Navigation

- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and filters
- **Escape**: Close modal dialogs

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
    "rates": "$2.50/hour",
    "hours": "6 AM - 10 PM",
    "monthly": "Monthly permits available",
    "height": "No height restrictions",
    "type": "Open lot",
    "phone": "(808) 555-0123"
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Hawaii Business Magazine**: Parking information (https://www.hawaiibusiness.com/the-downtown-honolulu-parking-guide-returns-with-new-updates/)
- **OpenStreetMap**: Map data and tiles
- **Leaflet**: Interactive mapping library
- **MarkerCluster**: Efficient marker clustering
- **Poppins Font**: Typography by Google Fonts

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/jacobrg808/honolulu-parking/issues) page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

---

**Made with care for the Honolulu community**