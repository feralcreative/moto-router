# Motorcycle Ride Planning Project

This project provides a platform for sharing and visualizing motorcycle ride routes, including interactive maps and downloadable GPS tracks. It is designed to be easily extended with new ride route pages based on a reusable template system.

## Template System (`/template`)

The `/template` directory contains the base files and structure for creating new ride route pages. To add a new route, simply copy the `/template` directory, rename it as needed, and update its contents for your specific route.

### Structure of `/template`

- `index.html`: The main HTML file for the route page. It uses Bootstrap for layout and styling, loads Google Maps for route visualization, and includes a panel for route information and downloads. The file references `/js/main.js` (for map logic) and `/style/style.min.css` (for custom styles).
- `data/`: This folder contains all route-specific data files:

  - `.gpx` and `.kml` files: GPS tracks for each segment of the ride, in standard formats compatible with most mapping/GPS tools.
  - `routes.json`: Metadata for the routes (e.g., names, descriptions, ordering). This file is used by the page scripts to display available routes and downloads.
  - `generate-routes-json.sh`: A shell script to regenerate `routes.json` based on the current `.kml` files in the directory. This ensures that the route list is always up to date after adding, removing, or renaming `.kml` files.

    **Usage:**

    ```sh
    cd template/data
    ./generate-routes-json.sh
    ```

    This will create or update `routes.json` to include all `.kml` files in alphabetical order. Requires `jq` to be installed.

#### What is `jq`?

[`jq`](https://stedolan.github.io/jq/) is a lightweight and flexible command-line tool for working with JSON data. It is used in the `generate-routes-json.sh` script to format the list of `.kml` files into a valid `routes.json` file.

**Installation:**

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

### Main Components

- **`initMap()`**: Entry point called by Google Maps API. Sets up the map, loads all KML routes, and builds the UI.
- **`loadKmlRoute(kmlUrl, polylineColor, fitBounds, routeIndex)`**: Fetches and parses a KML file, draws its polyline, computes mileage, and stores references for interactivity.
- **`addRouteDownloadButtons()`**: Builds a table of available routes with download buttons for GPX/KML files, and sets up UI interactions for highlighting and selection.
- **`updateRouteLegend()`**: Updates the route legend UI with color coding.
- **Helpers**:
  - `getWaypointTitle(role)`: Maps waypoint roles to display titles.
  - `getColoredSvgIcon(iconPath, color, opacity)`: Generates custom SVG icons for map markers.
  - `setRouteHighlight(activeIndex)`: Centralizes logic for highlighting/dimming routes and markers.
  - `hexToRgba(hex, alpha)`: Converts hex colors to RGBA for CSS.

### Data Flow

- The script loads a list of available routes from `data/routes.json`.
- For each `.kml` file listed, it loads the file, parses the coordinates, and draws the route on the map.
- For each route, it creates download buttons for GPX and KML formats if available.
- Interactive features (highlighting, legends, marker icons) are dynamically generated based on the loaded data.

### Usage

- The script is loaded by `index.html` and is automatically called when the page loads.
- It requires the Google Maps JavaScript API (with Geometry library) and expects the map container to have the ID `map`.
- The route data files (`.kml`, `.gpx`, `routes.json`) must be present in the `data/` directory.

### Dependencies and Environment

This project uses the Google Maps JavaScript API with the Geometry library. You must provide your own API key.

**Additional dependencies:**
- The project uses a shell script (`generate-routes-json.sh`) and [`jq`](https://stedolan.github.io/jq/) for processing route files. `jq` must be installed on your system to run the script.

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

| Type   | Icon                                                                         | File Location              |
| ------ | ---------------------------------------------------------------------------- | -------------------------- |
| MEET   | <img src="/img/icons/icon-meet.svg" width="25" height="25" alt="Meet" />     | /img/icons/icon-meet.svg   |
| CAMP   | <img src="/img/icons/icon-camp.svg" width="25" height="25" alt="Camp" />     | /img/icons/icon-camp.svg   |
| GAS    | <img src="/img/icons/icon-gas.svg" width="25" height="25" alt="Gas" />       | /img/icons/icon-gas.svg    |
| CHARGE | <img src="/img/icons/icon-charge.svg" width="25" height="25" alt="Charge" /> | /img/icons/icon-charge.svg |
| FOOD   | <img src="/img/icons/icon-food.svg" width="25" height="25" alt="Food" />     | /img/icons/icon-food.svg   |
| HOTEL  | <img src="/img/icons/icon-hotel.svg" width="25" height="25" alt="Hotel" />   | /img/icons/icon-hotel.svg  |
| DRINKS | <img src="/img/icons/icon-drinks.svg" width="25" height="25" alt="Drinks" /> | /img/icons/icon-drinks.svg |
| COFFEE | <img src="/img/icons/icon-coffee.svg" width="25" height="25" alt="Coffee" /> | /img/icons/icon-coffee.svg |
| POI    | <img src="/img/icons/icon-poi.svg" width="25" height="25" alt="POI" />       | /img/icons/icon-poi.svg    |
| VIEW   | <img src="/img/icons/icon-view.svg" width="25" height="25" alt="View" />     | /img/icons/icon-view.svg   |


### Route Colors

Each route polyline is assigned a color from a predefined list in the script. Colors are cycled for multiple routes.

#### How to Customize Route Colors

1. Open `js/main.js` and search for `const colors = [` to locate the color palette.
2. Edit the hex color values in the array to your preference. You can add, remove, or rearrange colors as needed.
3. The script will automatically apply these colors to routes, cycling through the list if there are more routes than colors.

This makes it easy to control the visual identity of your maps and ensure each route is clearly distinguishable.

**Current Color Palette (as defined in the script):**

| Order | Hex Code  | Label      |
| ----- | --------- | ---------- |
| 1     | `#cc0000` | Red        |
| 2     | `#0000cc` | Blue       |
| 3     | `#DD00DD` | Magenta    |
| 4     | `#4A148C` | Purple     |
| 5     | `#00aaaa` | Cyan       |
| 6     | `#FF6F00` | Orange     |
| 7     | `#4E342E` | Brown      |
| 8     | `#006064` | Teal       |
| 9     | `#0D1335` | Dark Blue  |
| 10    | `#A0740B` | Mustard    |
| 11    | `#003300` | Dark Green |
| 12    | `#550000` | Burgundy   |
| 13    | `#8800DD` | Violet     |

This is the actual palette used for route polylines. You can update or expand it as needed for your project.
