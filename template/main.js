console.log("Inline JS: head tag parsed");

window.initMap = async function () {
  // Inject CSS to hide the close (X) button on Google Maps InfoWindows
  const style = document.createElement("style");
  style.innerHTML = ".gm-ui-hover-effect { display: none !important; }";
  document.head.appendChild(style);

  console.log("initMap called");
  const mapDiv = document.getElementById("map");
  const center = { lat: 37.665817, lng: -121.949321 };
  const map = new google.maps.Map(mapDiv, {
    center,
    zoom: 10,
    mapTypeId: "terrain",
    mapId: "a14091e53ca43382",
  });
  console.log("Map instance created");

  // --- Load Both Routes ---
  function loadKmlRoute(kmlUrl, polylineColor, fitBounds = false, routeIndex) {
    // Keep track of current route index
    const currentRouteIndex = routeIndex;

    fetch(kmlUrl)
      .then((res) => {
        console.log(`KML fetch status for ${kmlUrl}:`, res.status, "Content-Type:", res.headers.get("Content-Type"));
        if (!res.ok) {
          console.error(`Failed to fetch KML file (${kmlUrl}):`, res.statusText);
          throw new Error(`KML fetch error ${res.status}`);
        }
        return res.text();
      })
      .then((kmlText) => {
        console.log(`[${kmlUrl}] Raw KML length:`, kmlText.length);
        const xmlIdx = kmlText.indexOf("<?xml");
        const cleanText = xmlIdx >= 0 ? kmlText.slice(xmlIdx) : kmlText;
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(cleanText, "application/xml");
        const ns = kmlDoc.documentElement.namespaceURI;
        let coordsEls = kmlDoc.getElementsByTagNameNS(ns, "coordinates");
        if (!coordsEls || coordsEls.length === 0) coordsEls = kmlDoc.getElementsByTagNameNS("*", "coordinates");
        if (!coordsEls || coordsEls.length === 0) coordsEls = kmlDoc.getElementsByTagName("coordinates");
        if (!coordsEls || coordsEls.length === 0) {
          console.error(`[${kmlUrl}] No <coordinates> elements found in KML`, kmlDoc);
          return;
        }
        let maxCount = 0;
        let coordEl = coordsEls[0];
        Array.from(coordsEls).forEach((el) => {
          const count = el.textContent.trim().split(/\s+/).length;
          if (count > maxCount) {
            maxCount = count;
            coordEl = el;
          }
        });
        const coordText = coordEl.textContent.trim();
        const path = coordText
          .split(/\s+/)
          .map((pair) => {
            const [lng, lat] = pair.split(",").map(Number);
            return { lat, lng };
          })
          .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));
        console.log(`[${kmlUrl}] Parsed path:`, path);
        if (!path.length) {
          console.error(`[${kmlUrl}] No valid path points parsed!`);
          return;
        }
        // Draw polyline for this route
        const routePolyline = new google.maps.Polyline({
          path,
          strokeColor: polylineColor,
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map,
          zIndex: 2,
        });
        // Store polylines and markers in global arrays for table interaction
        if (!window.routePolylines) window.routePolylines = [];
        if (!window.routeMarkers) window.routeMarkers = [];
if (!window.routeMarkers[currentRouteIndex]) window.routeMarkers[currentRouteIndex] = [];
        window.routePolylines[currentRouteIndex] = routePolyline;
        // window.routeMarkers[currentRouteIndex] is initialized above if needed
        if (fitBounds) {
          const bounds = new google.maps.LatLngBounds();
          path.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds);
        }
        // Add KML waypoints as markers
        const placemarks = kmlDoc.getElementsByTagNameNS(ns, "Placemark");
        const allPMs = Array.from(placemarks);
        const pointPMs = allPMs.filter((pm) => pm.getElementsByTagNameNS(ns, "Point").length > 0);
        pointPMs.forEach((pm, i) => {
          const pointEl = pm.getElementsByTagNameNS(ns, "Point")[0];
          if (!pointEl) return;
          const coordsEl = pointEl.getElementsByTagNameNS(ns, "coordinates")[0];
          if (!coordsEl) return;
          const [lng, lat] = coordsEl.textContent.trim().split(",").map(Number);
          const nameEl = pm.getElementsByTagNameNS(ns, "name")[0];
          const name = nameEl ? nameEl.textContent : "";
          const descEl = pm.getElementsByTagNameNS(ns, "description")[0];
          const desc = descEl ? descEl.textContent : "";
          // --- Custom SVG marker logic ---
          const roleIconMap = {
            MEET: "/img/icons/icon-meet.svg",
            CAMP: "/img/icons/icon-camp.svg",
            GAS: "/img/icons/icon-gas.svg",
            CHARGE: "/img/icons/icon-charge.svg",
            FOOD: "/img/icons/icon-food.svg",
            HOTEL: "/img/icons/icon-hotel.svg",
            DRINKS: "/img/icons/icon-drinks.svg",
            COFFEE: "/img/icons/icon-coffee.svg",
            POI: "/img/icons/icon-poi.svg",
            VIEW: "/img/icons/icon-view.svg",
          };

          // --- SVG Icon Cache ---
window.svgIconCache = window.svgIconCache || {};
async function getColoredSvgIcon(iconPath, color, opacity = 1.0) {
            const resp = await fetch(iconPath);
            let svg = await resp.text();
            // Replace any fill="currentColor" or fill="#000" or fill="#fff" with the route color
            svg = svg.replace(/fill="(currentColor|#000|#fff)"/gi, `fill="${color}"`);
            // Also replace any fill:none with fill:color if needed
            svg = svg.replace(/fill:none/gi, `fill:${color}`);
            // Set global opacity on SVG root
            svg = svg.replace(/<svg /, `<svg opacity=\"${opacity}\" `);
            const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
            return `data:image/svg+xml;charset=UTF-8,${encoded}`;
          }

          // Make number-only markers smaller
          let isNumberOnly = /^\d+$/.test(name.trim());
          let iconOpts = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#fff", // Hollow center
            fillOpacity: 1,
            strokeColor: polylineColor, // Border matches line
            strokeWeight: 4,
            scale: isNumberOnly ? (i === 0 ? 3 : 2) : i === 0 ? 6 : 4,
          };

          // Detect role prefix in name (e.g., MEET, CAMP, etc.)
          let role = null;
          let displayName = name;
          const prefixMatch = name.match(/^(MEET|CAMP|GAS|CHARGE|FOOD|HOTEL|DRINKS|COFFEE|POI|VIEW)\s+-\s+(.*)$/i);
          let markerIcon = iconOpts; // default
          if (prefixMatch) {
            role = prefixMatch[1].toUpperCase();
            displayName = prefixMatch[2];
            const iconPath = roleIconMap[role];
            if (iconPath) {
              // Cache both full and dimmed SVG icons
              if (!window.svgIconCache[iconPath]) window.svgIconCache[iconPath] = {};
              Promise.all([
                getColoredSvgIcon(iconPath, polylineColor, 1.0),
                getColoredSvgIcon(iconPath, polylineColor, 0.3)
              ]).then(([svgFull, svgDim]) => {
                window.svgIconCache[iconPath][polylineColor] = { full: svgFull, dim: svgDim };
                const marker = new google.maps.Marker({
                  position: { lat, lng },
                  map,
                  title: displayName,
                  icon: {
                    url: svgFull,
                    scaledSize: new google.maps.Size(25, 25),
                    anchor: new google.maps.Point(12.5, 12.5),
                  },
                  optimized: false,
                });
                marker._svgIconPaths = { iconPath, polylineColor }; // for later lookup
                // Store marker for highlight logic
                if (window.routeMarkers && Array.isArray(window.routeMarkers[currentRouteIndex])) {
                  window.routeMarkers[currentRouteIndex].push(marker);
                }
                const infowindow = new google.maps.InfoWindow({
                  content: `<strong>${displayName}</strong><br/>${desc}`,
                  disableAutoPan: false,
                  shouldFocus: false,
                });
                marker.addListener("mouseover", () => infowindow.open({ map, anchor: marker }));
                marker.addListener("mouseout", () => infowindow.close());
                marker.addListener("click", () => infowindow.open({ map, anchor: marker }));
              });
              return; // skip normal marker creation below
            }
          }

          // Fallback: use default iconOpts
          const marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: displayName,
            icon: iconOpts,
            optimized: false,
          });
          marker._isCircle = true; // for highlight logic
          // Store marker for highlight logic
          window.routeMarkers[currentRouteIndex].push(marker);
          const infowindow = new google.maps.InfoWindow({
            content: `<strong>${displayName}</strong><br/>${desc}`,
            disableAutoPan: false,
            shouldFocus: false,
          });
          marker.addListener("mouseover", () => infowindow.open({ map, anchor: marker }));
          marker.addListener("mouseout", () => infowindow.close());
          marker.addListener("click", () => infowindow.open({ map, anchor: marker }));
        });
      })
      .catch((err) => console.error(`[${kmlUrl}] Failed to load KML:`, err));
  }

  // Load up to 99 routes
  // 20 visually distinct, contrasting colors spaced around the color wheel
  const colors = [
    "#FF0000", // Red
    "#4800FF", // Indigo
    "#aa00aa", // Purple
    "#D900FF", // Magenta
    "#FF0037", // Crimson
    "#8F00FF", // Violet
    "#005500", // Green
    "#B30000", // Dark Red
    "#7300B3", // Purple
    "#004CFF", // Blue
    "#FF006E", // Rose
  ];

  // Populate the route legend with colored borders
  function updateRouteLegend(routeMap, colors) {
    const legendDiv = document.getElementById("route-legend");
    if (!legendDiv) return;
    legendDiv.innerHTML = "";
    Object.entries(routeMap).forEach(([routeNum, data], i) => {
      const color = colors[i % colors.length];
      const span = document.createElement("span");
      span.textContent = data.name;
      span.style.display = "inline-block";
      span.style.padding = "2px 10px";
      span.style.margin = "0 6px 6px 0";
      span.style.border = `3px solid ${color}`;
      span.style.borderRadius = "8px";
      span.style.fontWeight = "bold";
      span.style.background = "#fff";
      span.style.color = "#222";
      legendDiv.appendChild(span);
    });
  }

  // Dynamically build download buttons for each route
  async function addRouteDownloadButtons() {
    const table = document.querySelector(".info-table");
    if (!table) return;

    // Remove old route rows if re-running
    Array.from(table.querySelectorAll(".route-download-row")).forEach((row) => row.remove());

    // Dynamically fetch available KML and GPX files from the data directory
    // This is a static list for now; in production, you would fetch this from the server or generate it server-side
    const resp = await fetch("data/routes.json");
    const kmlFiles = (await resp.json()).filter((f) => f.endsWith(".kml")).sort();
    const gpxFiles = kmlFiles.map((f) => f.replace(/\.kml$/, ".gpx"));

    // Build a map of routeNum => { kml, gpx, name }
    const routeMap = {};
    kmlFiles.forEach((file) => {
      const match = file.match(/^(\d{2})-(.+)\.kml$/);
      if (match) {
        const routeNum = match[1];
        const routeName = match[2].replace(/-/g, " ");
        if (!routeMap[routeNum]) routeMap[routeNum] = { name: routeName };
        routeMap[routeNum]["kml"] = file;
      }
    });
    gpxFiles.forEach((file) => {
      const match = file.match(/^(\d{2})-(.+)\.gpx$/);
      if (match) {
        const routeNum = match[1];
        if (!routeMap[routeNum]) routeMap[routeNum] = {};
        routeMap[routeNum]["gpx"] = file;
      }
    });
    // Update the legend after building the route map
    // updateRouteLegend(routeMap, colors); // Removed so no extra legend is rendered above the table.
    // Now render the table rows for each route
    Object.entries(routeMap).forEach(([num, route], i) => {
      if (!route.kml) return;
      const kmlPath = `data/${route.kml}`;
      const gpxPath = route.gpx ? `data/${route.gpx}` : null;
      const tr = document.createElement("tr");
      tr.className = "route-download-row";
      // Label TD
      const labelTd = document.createElement("td");
      labelTd.className = "label route-label";
      // Show human-friendly route name (e.g., 'Oakland to Mt Madonna')
      const friendlyName = route.name.replace(/-/g, " ");
      // Detect role prefix (e.g., MEET, CAMP, etc.)
      const roleMatch = friendlyName.match(/^(MEET|CAMP|GAS|CHARGE|FOOD|HOTEL|COFFEE|POI|VIEW)\b/i);
      let iconHtml = "";
      if (roleMatch) {
        const role = roleMatch[1].toUpperCase();
        const iconMap = {
          MEET: "icon-meet.svg",
          CAMP: "icon-camp.svg",
          GAS: "icon-gas.svg",
          CHARGE: "icon-charge.svg",
          FOOD: "icon-food.svg",
          HOTEL: "icon-hotel.svg",
          DRINKS: "icon-drinks.svg",
          COFFEE: "icon-coffee.svg",
          POI: "icon-hotel.svg",
          VIEW: "icon-hotel.svg",
        };
        const iconFile = iconMap[role];
        if (iconFile) {
          iconHtml = `<span class="route-icon-bg" style="background:${
            colors[i % colors.length]
          }"><img src=\"/img/icons/${iconFile}\" alt=\"${role}\" class=\"route-icon\"></span>`;
        }
      }
      // Add route line icon before the label
      const routeLineIcon = `<svg class="route-table-line-icon" width="38" height="18" viewBox="0 0 38 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:0.5em;"><circle cx="7" cy="9" r="4" fill='none' stroke='${
        colors[i % colors.length]
      }' stroke-width="2"/><circle cx="31" cy="9" r="4" fill='none' stroke='${
        colors[i % colors.length]
      }' stroke-width="2"/><line x1="11" y1="9" x2="27" y2="9" stroke='${
        colors[i % colors.length]
      }' stroke-width="3" stroke-linecap="round"/></svg>`;
      labelTd.innerHTML = routeLineIcon + iconHtml + friendlyName;
      labelTd.style.borderColor = colors[i % colors.length];
      // Set CSS variable for highlight background (10% opacity)
      function hexToRgba(hex, alpha) {
        // Expand shorthand form (e.g. "#03F") to full form
        let c = hex.replace("#", "");
        if (c.length === 3)
          c = c
            .split("")
            .map((x) => x + x)
            .join("");
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
      }
      labelTd.style.setProperty("--route-color-bg", hexToRgba(colors[i % colors.length], 0.1));
      tr.appendChild(labelTd);
      // --- Centralized highlight/dim logic ---
      function setRouteHighlight(activeIndex) {
  console.log('setRouteHighlight called with activeIndex:', activeIndex);
  console.log('window.routePolylines:', window.routePolylines);
  console.log('window.routeMarkers:', window.routeMarkers);
        // Polylines
        window.routePolylines.forEach((polyline, idx) => {
    console.log(`Polyline idx=${idx}, activeIndex=${activeIndex}, polyline=`, polyline);
          polyline.setOptions({
            strokeOpacity: activeIndex == null ? 0.6 : (idx === activeIndex ? 1.0 : 0.3),
            zIndex: activeIndex == null ? 1 : (idx === activeIndex ? 2 : 1),
          });
        });
        // Markers
        window.routeMarkers.forEach((markers, idx) => {
    console.log(`Markers for route idx=${idx}, activeIndex=${activeIndex}:`, markers);
    if (!markers) return;
          if (!markers) return;
          const isActive = activeIndex == null ? null : idx === activeIndex;
          markers.forEach((marker, markerIdx) => {
      if (!marker) return;
      if (marker._svgIconPaths) {
        console.log(`  [SVG] Marker markerIdx=${markerIdx}, routeIdx=${idx}, iconPath=`, marker._svgIconPaths);
      } else if (marker._isCircle) {
        console.log(`  [CIRCLE] Marker markerIdx=${markerIdx}, routeIdx=${idx}`);
      } else {
        console.log(`  [UNKNOWN] Marker markerIdx=${markerIdx}, routeIdx=${idx}`);
      }
            if (!marker) return;
            // SVG
            if (marker._svgIconPaths) {
              const { iconPath, polylineColor } = marker._svgIconPaths;
              const cache = window.svgIconCache[iconPath] && window.svgIconCache[iconPath][polylineColor];
              if (cache) {
                marker.setIcon({
                  url: isActive === null ? cache.full : (isActive ? cache.full : cache.dim),
                  scaledSize: new google.maps.Size(25, 25),
                  anchor: new google.maps.Point(12.5, 12.5),
                });
              }
            } else if (marker._isCircle) {
              // Circle
              const icon = marker.getIcon();
              const newIcon = { ...icon };
              if (isActive === null) {
                newIcon.strokeOpacity = 1.0;
                newIcon.fillOpacity = 1.0;
              } else {
                newIcon.strokeOpacity = isActive ? 1.0 : 0.3;
                newIcon.fillOpacity = isActive ? 1.0 : 0.3;
              }
              marker.setIcon(newIcon);
            }
            marker.setZIndex(isActive === null ? 1 : (isActive ? 2 : 1));
          });
        });
      }
      // --- Map highlight on hover ---
      labelTd.addEventListener("mouseenter", () => setRouteHighlight(i));
      labelTd.addEventListener("mouseleave", () => setRouteHighlight(null));
      // Buttons TD
      const btnTd = document.createElement("td");
      btnTd.className = "value";
      const btnGroup = document.createElement("div");
      btnGroup.className = "buttons";

      // GPX
      if (gpxPath) {
        const gpxBtn = document.createElement("a");
        gpxBtn.className = "btn btn-sm btn-outline-primary gpx-btn";
        gpxBtn.href = gpxPath;
        gpxBtn.target = "_blank";
        gpxBtn.textContent = "GPX";
        btnGroup.appendChild(gpxBtn);
      }

      // KML
      const kmlBtn = document.createElement("a");
      kmlBtn.className = "btn btn-sm btn-outline-success kml-btn";
      kmlBtn.href = kmlPath;
      kmlBtn.target = "_blank";
      kmlBtn.textContent = "KML";
      btnGroup.appendChild(kmlBtn);

      btnTd.appendChild(btnGroup);
      tr.appendChild(btnTd);
      table.appendChild(tr);
    });
  }

  // --- End of addRouteDownloadButtons ---

  async function loadAllKmlRoutes() {
    // This is a static list for now; in production, fetch from server or manifest
    const resp = await fetch("data/routes.json");
    const kmlFiles = (await resp.json()).filter((f) => f.endsWith(".kml")).sort();
    let fitBoundsDone = false;
    kmlFiles.forEach((file, i) => {
      const color = colors[i % colors.length];
      const kmlPath = `data/${file}`;
      loadKmlRoute(kmlPath, color, !fitBoundsDone, i);
      if (!fitBoundsDone) fitBoundsDone = true;
    });
  }

  await addRouteDownloadButtons();
  await loadAllKmlRoutes();
};

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inline JS: body tag parsed, running under", location.href);
  console.log("Post-map script: map in DOM:", document.getElementById("map"));
});
