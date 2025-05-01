# Google Maps JavaScript API Docs

## Step 2: Create HTML, CSS, and JS

Key learnings from the tutorial:

- Load the Maps JavaScript API via a bootstrap script tag in your HTML’s `<head>`:
  ```html
  <script
    src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=maps,marker"
    defer></script>
  ```
- Include required libraries in the URL query (`libraries=maps,marker`) to enable web components and marker support.
- Use the `defer` attribute so the API loads after parsing your HTML but before execution of dependent code.
- Ensure this script is added before using `<gmp-map>` custom elements.

### HTML Scaffold and JS Callback

- Create a minimal HTML scaffold:
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>Your Map</title>
      <!-- Maps API loader script above -->
    </head>
    <body>
      <!-- Map container -->
      <gmp-map center="LAT,LNG" zoom="ZOOM_LEVEL" map-id="YOUR_MAP_ID"></gmp-map>

      <script>
        function initMap() {
          // Callback logic to initialize markers, overlays, etc.
        }
      </script>
    </body>
  </html>
  ```

- Add CSS to define map container dimensions and display:
  ```css
  gmp-map {
    display: block;
    height: 100vh; /* full viewport height */
    width: 100%;
  }
  ```

- The `initMap()` function is invoked once the API loads (via `callback=initMap`). Expand this function to add markers or additional map logic.
