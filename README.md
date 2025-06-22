# Motorcycle Ride Planning Project

A platform for sharing and visualizing motorcycle ride routes, featuring interactive maps and downloadable GPS tracks. Designed for easy extension with new ride route pages using a reusable template system.

---

## 📁 Project Structure

### `/template` Directory

This directory contains the base files and structure for creating new ride route pages.

**Contents:**

- **`index.html`**  
  The main HTML file for the route page.

  - Uses Bootstrap for layout and styling.
  - Loads Google Maps for route visualization.
  - Includes a panel for route information and downloads.
  - References `/js/main.js` (map logic) and `/css/main.min.css` (custom styles).

- **`data/`**  
  Folder for all route-specific data files:
  - `.gpx`, `.kml`, and `.url`: GPS tracks and route links for each ride segment (see sample files like `01-Sample-Route-One.kml`, `01-Sample-Route-One.gpx`, `01-Sample-Route-One.url`).
  - `routes.json`: List of route base names (e.g., `{ "base": "01-Sample-Route-One" }`).
    - Used by page scripts to display routes and downloads.
  - `build.sh`: Helper script to auto-generate `routes.json` from available tracks.

---

## 🚦 Quick Start: Creating a New Route Page

1. **Copy the Template:**  
   Duplicate the `/template` directory and rename it for your ride (e.g., `/2025-spring-ride`).

2. **Update Data Files:**  
   Replace/add `.gpx`/`.kml` files and update `routes.json` to match your new segments. Optionally, use `build.sh` to automate this.

   **Add route URL Links:**  
   For each route, create a `.kml`, `.gpx`, and (optionally) `.url` file with the same base name (e.g., `01-Sample-Route-One`).
   - The `.url` file should contain the route URL on the first line (if you want a URL button).
   - When you run `build.sh`, the script will add an entry for each route base name in `routes.json`.
   - The site will automatically show download buttons for each format that exists.

   **Example:**

   ```
   01-Sample-Route-One.kml
   01-Sample-Route-One.gpx
   01-Sample-Route-One.url  # contains: https://www.myrouteapp.com/route/123456
   ```

3. **Customize `index.html`:**  
   Edit titles, descriptions, and content for your ride.

4. **Add to Navigation:**  
   If the site has a main navigation or index, add a link to your new route page.

**Example:**

```sh
cp -r template coastal-adventure-2025
# Edit coastal-adventure-2025/index.html and data/* as needed
```

Visiting `/coastal-adventure-2025/` will show your new ride page with interactive maps and downloads.

---

## ⚠️ Important Notes

- **Manual Data Sync:**  
  Update `routes.json` whenever you add, remove, or rename `.kml` files in `data/` by running `build.sh`.  
  The map and download buttons will appear for each route base listed in `routes.json`, and for each file format that exists.

- **Route File Integration:**  
  For each route, just create files with the same base name and the `.kml`, `.gpx`, and (optionally) `.url` extensions (e.g., `02-Sample-Route-Two.kml`, `02-Sample-Route-Two.gpx`, `02-Sample-Route-Two.url`).
  - The `.url` file should contain the route URL on the first line. If no `.url` file is present, there will be no URL button for that route.
  - You do NOT need to list each file in `routes.json`; just the base name is required.

- **Route Pages:**  
  The main ride pages live in subdirectories copied from `/template` (e.g., `/2025-spring-ride/`), not at the project root.

---

## 🛠️ Local Development & Running the Project

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Set up environment variables:**
   - Create a `.env` file in the project root with your Google Maps API key:
     ```env
     GOOGLE_MAPS_API_KEY=your-key-here
     ```
3. **Start the server:**
   - For production:
     ```sh
     npm start
     ```
   - For development (with live reload, see below):
     ```sh
     npm run dev
     ```
   - The Express server runs on port 3000 by default.

---

## 💻 SCSS/CSS Workflow

- Edit styles in `/css/main.scss`.
- Compile to `/css/main.min.css` (and `/css/main.css` if needed) using your preferred SCSS build tool (e.g., `sass`, `node-sass`, or an editor extension):
  ```sh
  sass css/main.scss css/main.min.css --style=compressed
  ```
- The HTML references `/css/main.min.css`.

---

## 🔄 Live Reload & BrowserSync (Optional)

- For a better development experience, use BrowserSync to auto-reload the browser on file changes.
- A separate Browsersync config and script is provided (see `/www/_browsersync/bs-config-moto.js`).
- To start BrowserSync for this project:
  ```sh
  cd ../_browsersync
  npm run start-moto
  ```
- Make sure your Express server is running before starting BrowserSync.

---

## 🗺️ JavaScript Map Logic (`js/main.js`)

Handles all interactive map logic for ride route pages.

### Features:

- Initializes Google Map and configures appearance.
- Loads/parses `.kml` route files, displays ride paths as colored polylines.
- Calculates route mileage (Google Maps Geometry API).
- Generates route legend and download buttons for each route.
- Manages interactive features (route highlighting, marker display).
- Reads from `data/routes.json` to determine which routes to display.

### Main Components:

- **`initMap()`**: Entry point, sets up map, loads KML routes, builds UI.
- **`loadKmlRoute()`**: Fetches/parses KML, draws polyline, computes mileage.
- **`addRouteDownloadButtons()`**: Builds download table, sets up UI interactions.
- **`updateRouteLegend()`**: Updates color-coded route legend.
- **Helpers:**
  - `getWaypointTitle(role)`, `getColoredSvgIcon(iconPath, color, opacity)`, `setRouteHighlight(activeIndex)`, `hexToRgba(hex, alpha)`

### Data Flow:

- Loads available routes from `data/routes.json`.
- For each `.kml`, loads and draws on the map.
- Creates download buttons for GPX/KML if available.
- Interactive features are generated based on loaded data.

### Usage:

- Script is loaded by `index.html` and runs on page load.
- Requires Google Maps JS API (with Geometry library).
- Map container must have ID `map`.
- Data files (`.kml`, `.gpx`, `routes.json`) must be present in `data/`.

---

## 🗺️ Route Loading Logic

The map template loads and displays routes through the following process:

1. **Configuration**:
   - Routes are configured in `data/routes.json` as an array of objects: `[{ "base": "route-name" }, ...]`
   - Each route's `base` property defines the filename prefix for its KML/GPX files
   - Example: `{ "base": "01-Sample-Route-One" }` will load `data/01-Sample-Route-One.kml`

2. **Loading Process**:
   - The map initializes when Google Maps API loads and calls `window.initMap()`
   - `initMap()` fetches route configuration from `/data/routes.json`
   - For each route, it fetches and parses the corresponding KML file
   - Coordinates are extracted from KML and converted to Google Maps polylines
   - Each route is assigned a color from a predefined palette
   - Polylines are added to the map and stored in `window.routePolylines`

3. **UI Elements**:
   - Download buttons are generated for each route's GPX/KML files
   - A color-coded legend is created matching routes to their display colors
   - Interactive elements allow highlighting routes on hover

4. **Important Notes**:
   - All data files must be accessible at `/data/` relative to the server root
   - KML files must contain valid coordinate data in standard KML format
   - The map container must have ID `map`

---

## 📚 Further Customization

- See comments in `index.html` and `/js/main.js` for advanced customizations or to contribute new features.

- On macOS:
  ```sh
  brew install jq
  ```
- On Ubuntu/Linux:
  ```sh
  sudo apt-get install jq
  ```

### How to Use the Template

1. **Copy the Template**: Duplicate the `/template` directory and give it a new name relevant to your ride (e.g., `/2025-spring-ride`).
2. **Update Data Files**: Replace or add `.gpx`/`.kml` files and update `routes.json` to match your new route segments.
3. **Customize `index.html`**: Edit the HTML to update titles, descriptions, and any custom content for your ride.
4. **Add to Navigation**: If your site has a main navigation or index, add a link to your new route page.

### Example

Suppose you want to add a new ride called "Coastal Adventure 2025":

```sh
cp -r template coastal-adventure-2025
# Edit coastal-adventure-2025/index.html and data/* as needed
```

Now, visiting `/coastal-adventure-2025/` on your site will show the new ride page, with interactive maps and downloadable routes.

---

For more details on customizing the template or contributing new features, see the comments in `index.html` and the scripts in `/js/main.js`.

---

## JavaScript Map Logic (`js/main.js`)

This file provides all the interactive logic for the ride route map pages. It is responsible for:

- Initializing the Google Map and configuring its appearance.
- Loading and parsing `.kml` route files to display ride paths as colored polylines on the map.
- Calculating route mileage using the Google Maps Geometry API.
- Dynamically generating the route legend and download buttons for each available route.
- Managing interactive features such as route highlighting and marker display.
- Reading route data from `data/routes.json` to determine which routes to display.

### Main Components:

- **`initMap()`**: Entry point called by Google Maps API. Sets up the map, loads all KML routes, and builds the UI.
- **`loadKmlRoute(kmlUrl, polylineColor, fitBounds, routeIndex)`**: Fetches and parses a KML file, draws its polyline, computes mileage, and stores references for interactivity.
- **`addRouteDownloadButtons()`**: Builds a table of available routes with download buttons for GPX/KML files, and sets up UI interactions for highlighting and selection.
- **`updateRouteLegend()`**: Updates the route legend UI with color coding.
- **Helpers:**
  - `getWaypointTitle(role)`: Maps waypoint roles to display titles.
  - `getColoredSvgIcon(iconPath, color, opacity)`: Generates custom SVG icons for map markers.
  - `setRouteHighlight(activeIndex)`: Centralizes logic for highlighting/dimming routes and markers.
  - `hexToRgba(hex, alpha)`: Converts hex colors to RGBA for CSS.

### Data Flow:

- The script loads a list of available routes from `data/routes.json`.
- For each `.kml` file listed, it loads the file, parses the coordinates, and draws the route on the map.
- For each route, it creates download buttons for GPX and KML formats if available.
- Interactive features (highlighting, legends, marker icons) are dynamically generated based on the loaded data.

### Usage

- The script is loaded by `index.html` and is automatically called when the page loads.
- It requires the Google Maps JavaScript API (with Geometry library) and expects the map container to have the ID `map`.
- The route data files (`.kml`, `.gpx`, `routes.json`) must be present in the `data/` directory.

### Adding route URL Links

To display a blue **URL** button for each route (linking directly to route URL), edit `template/data/routes.json` and add the route URL for each route in the `url` field. Example:

```json
[
  { "base": "01-Oakland-to-Mt-Madonna" },
  { "base": "02-Campsite-to-Meeting-Point" },
  { "base": "03-Boardwalk-to-Campsite" }
]
```

- For each base, the site will show download buttons for `.kml`, `.gpx`, and (if present) a URL button for `.url`.

### Dependencies and Environment

This project uses the Google Maps JavaScript API with the Geometry library. You must provide your own API key.

**Additional dependencies:**

- The project uses a shell script (`build.sh`) and [`jq`](https://stedolan.github.io/jq/) for processing route files. `jq` must be installed on your system to run the script.

#### Setting the Google Maps API Key

For security and flexibility, the Google Maps API key is now loaded from an environment variable using a `.env` file. The template at `template/index.html` expects the key to be injected as `GOOGLE_MAPS_API_KEY`.

Create a file named `.env` in the project root with the following contents:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

Replace `your-google-maps-api-key-here` with your actual API key.

If you share this project, share instructions for setting up the `.env` file but do **not** share your actual API key.

### Customization

- To add new routes, update `routes.json` and add the corresponding `.kml`/`.gpx` files.
- Colors and UI styling can be changed in the script or via CSS.
- The script is modular, so you can extend or override helper functions for custom marker icons, legends, or interactivity.

---

## Waypoint Types, Icons, and Route Colors

### Waypoint Types and Icons

Each waypoint on the map can be assigned a type, which determines the icon used to represent it. The mapping is defined in the script as follows:

---

> **IMPORTANT: How to Trigger Waypoint Icons**
>
> To display the correct icon for a waypoint, **name the waypoint in your mapping software with a prefix in this format:**
>
> ```
> TYPE - Waypoint Name
> ```
>
> Where `TYPE` is one of the supported types above (e.g., `GAS - Chevron Station`).
> This ensures the correct icon is displayed for each waypoint on the map.

---

| Type    | Icon                                                                         | File Location               |
| ------- | ---------------------------------------------------------------------------- | --------------------------- |
| MEET    | <img src="/img/icons/icon-meet.svg" width="25" height="25" alt="Meet" />     | /img/icons/icon-meet.svg    |
| CAMP    | <img src="/img/icons/icon-camp.svg" width="25" height="25" alt="Camp" />     | /img/icons/icon-camp.svg    |
| GAS     | <img src="/img/icons/icon-gas.svg" width="25" height="25" alt="Gas" />       | /img/icons/icon-gas.svg     |
| CHARGE  | <img src="/img/icons/icon-charge.svg" width="25" height="25" alt="Charge" /> | /img/icons/icon-charge.svg  |
| FOOD    | <img src="/img/icons/icon-food.svg" width="25" height="25" alt="Food" />     | /img/icons/icon-food.svg    |
| HOTEL   | <img src="/img/icons/icon-hotel.svg" width="25" height="25" alt="Hotel" />   | /img/icons/icon-hotel.svg   |
| DRINKS  | <img src="/img/icons/icon-drinks.svg" width="25" height="25" alt="Drinks" /> | /img/icons/icon-drinks.svg  |
| COFFEE  | <img src="/img/icons/icon-coffee.svg" width="25" height="25" alt="Coffee" /> | /img/icons/icon-coffee.svg  |
| GROCERY | <img src="/img/icons/icon-grocery.svg" width="25" height="25" alt="View" />  | /img/icons/icon-grocery.svg |
| POI     | <img src="/img/icons/icon-poi.svg" width="25" height="25" alt="POI" />       | /img/icons/icon-poi.svg     |
| VIEW    | <img src="/img/icons/icon-view.svg" width="25" height="25" alt="View" />     | /img/icons/icon-view.svg    |

### Route Colors

Each route polyline is assigned a color from a predefined list in the script. Colors are cycled for multiple routes.

#### How to Customize Route Colors

1. Open `js/main.js` and search for `const colors = [` to locate the color palette.
2. Edit the hex color values in the array to your preference. You can add, remove, or rearrange colors as needed.
3. The script will automatically apply these colors to routes, cycling through the list if there are more routes than colors.

This makes it easy to control the visual identity of your maps and ensure each route is clearly distinguishable.

**Current Color Palette (as defined in the script):**

| Order | Hex Code  | Label      | Swatch |
| ----- | --------- | ---------- | ------ |
| 1     | `#cc0000` | Red        | ![Red](img/colors/swatch-red.png) |
| 2     | `#0000cc` | Blue       | ![Blue](img/colors/swatch-blue.png) |
| 3     | `#DD00DD` | Magenta    | ![Magenta](img/colors/swatch-magenta.png) |
| 4     | `#4A148C` | Purple     | ![Purple](img/colors/swatch-purple.png) |
| 5     | `#00aaaa` | Cyan       | ![Cyan](img/colors/swatch-cyan.png) |
| 6     | `#FF6F00` | Orange     | ![Orange](img/colors/swatch-orange.png) |
| 7     | `#4E342E` | Brown      | ![Brown](img/colors/swatch-brown.png) |
| 8     | `#006064` | Teal       | ![Teal](img/colors/swatch-teal.png) |
| 9     | `#0D1335` | Dark Blue  | ![Dark Blue](img/colors/swatch-darkblue.png) |
| 10    | `#A0740B` | Mustard    | ![Mustard](img/colors/swatch-mustard.png) |
| 11    | `#003300` | Dark Green | ![Dark Green](img/colors/swatch-darkgreen.png) |
| 12    | `#550000` | Burgundy   | ![Burgundy](img/colors/swatch-burgundy.png) |
| 13    | `#8800DD` | Violet     | ![Violet](img/colors/swatch-violet.png) |

This is the actual palette used for route polylines. You can update or expand it as needed for your project.
