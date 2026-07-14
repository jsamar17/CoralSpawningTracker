# Coral Spawning Database Search - Squarespace Deployment Guide

## Overview
This is a standalone HTML/CSS/JavaScript application that can be embedded into your Squarespace website. The application provides an interactive map-based search for coral spawning events.

## Files Included
1. **index.html** - Complete standalone HTML page with embedded CSS
2. **coral-spawning-app.js** - JavaScript application with all functionality
3. **reef_scuba_logo.png** - REEF SCUBA logo (you'll need to add this)
4. **README.md** - This deployment guide

## Deployment Steps for Squarespace

### Option 1: Embed as Code Block (Recommended)
1. **Upload JavaScript file:**
   - Go to Design → Custom CSS
   - Click "Manage Custom Files" 
   - Upload `coral-spawning-app.js`
   - Note the URL provided

2. **Upload logo image:**
   - Upload `reef_scuba_logo.png` to your site's file library
   - Note the URL provided

3. **Create a new page:**
   - Add a new page in Squarespace
   - Add a Code Block to the page
   - Copy the entire contents of `index.html` into the code block
   - Update the JavaScript source path to match your uploaded file
   - Update the logo image path to match your uploaded image

4. **Update file paths in the HTML:**
   ```html
   <!-- Change this line -->
   <script src="coral-spawning-app.js"></script>
   <!-- To your Squarespace file URL -->
   <script src="/s/coral-spawning-app.js"></script>
   
   <!-- Change this line -->
   <img src="reef_scuba_logo.png" alt="REEF SCUBA" style="height: 180px;">
   <!-- To your Squarespace image URL -->
   <img src="/s/reef_scuba_logo.png" alt="REEF SCUBA" style="height: 180px;">
   ```

### Option 2: Custom Developer Mode (Advanced)
If you have Developer Mode enabled:
1. Upload all files to your template directory
2. Create a new page template that includes the HTML content
3. Reference the JavaScript file in your template

## Data Integration

### Adding Your Coral Spawning Data
The application currently includes sample data. To add your full dataset:

1. **Open `coral-spawning-app.js`**
2. **Find the `CORAL_SPAWNING_DATA` array (around line 9)**
3. **Replace the sample data with your complete dataset**

Your data should follow this format:
```javascript
const CORAL_SPAWNING_DATA = [
  {
    "id": 1,
    "genus": "Porites",
    "species": "cylindrica",
    "location": "Location Name",
    "latitude": -14.279444444444445,
    "longitude": -170.70083333333332,
    "date": "1988-10-27",
    "start_time": "20:30",
    "end_time": "21:00",
    "days_after_full_moon": 3,
    "gamete_release": "Sperm",
    "situation": "In situ",
    "timezone": "-11.0",
    "reference": "Study Reference",
    "image_url": "https://example.com/image.jpg"
  },
  // Add more events...
];
```

### Adding Coral Species Data
Update the `CORAL_SPECIES_DATA` object with your genus information:
```javascript
const CORAL_SPECIES_DATA = {
  "Porites": {
    "description": "Massive boulder corals, long-lived species",
    "common_name": "Boulder Coral",
    "spawning_pattern": "Annual synchronous spawning, extended season",
    "image_url": "https://example.com/porites-image.jpg"
  },
  // Add more genera...
};
```

## Customization Options

### Colors
The application uses CSS custom properties for easy color customization. In the `<style>` section of `index.html`, update these variables:
```css
:root {
    --accent-primary: #ec2547;    /* Red accent */
    --accent-secondary: #0f84bc;  /* Blue accent */
    --accent-tertiary: #114b89;   /* Dark blue accent */
}
```

### Map Settings
To change the default map center and zoom level, modify the `initMap()` function:
```javascript
// Change these coordinates and zoom level
map = L.map('map').setView([-18.2871, 147.6992], 6);
```

### Search Radius
To change the default and maximum search radius, update the slider in the HTML:
```html
<input type="range" class="form-range" id="distance-slider" 
       min="1" max="1000" value="50">
```

## Features Included
- Interactive map with location selection
- Distance-based search (1-1000km radius)
- Advanced filtering (year, month, days after full moon, genus)
- Event cards with coral images
- Detailed event modal popups
- Search results summary
- CSV export functionality
- Responsive design for mobile/desktop
- Professional dark theme
- REEF SCUBA branding

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Requires JavaScript enabled

## Support and Maintenance
- The application runs entirely client-side
- No server or database required
- Data is embedded in the JavaScript file
- Updates require editing the JavaScript file

## Performance Considerations
- All data loads when the page loads
- For very large datasets (>10,000 events), consider implementing pagination
- Images are loaded on-demand as cards are displayed
- Map tiles are cached by the browser

## Security Notes
- All code runs client-side
- No sensitive data is transmitted
- Uses HTTPS CDN resources for external libraries
- Safe for use on public websites

## Troubleshooting

### Common Issues:
1. **Map not loading:** Check internet connection and CDN access
2. **Images not showing:** Verify image URLs are accessible
3. **Search not working:** Check browser console for JavaScript errors
4. **Styling issues:** Ensure CSS is properly embedded

### Getting Help:
- Check browser developer console for error messages
- Verify all file paths are correct
- Test with sample data first before adding full dataset

## License and Attribution
Make sure to maintain the data source attribution as required:
- Indo-Pacific coral spawning database citation is included
- REEF SCUBA branding is preserved
- External library attributions are maintained

---

*This application was built as a specialized search engine for coral spawning events using modern web technologies and responsive design principles.*