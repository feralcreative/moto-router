console.log("Inline JS: head tag parsed");

window.initMap = async function () {
  // Inject CSS to hide the close (X) button on Google Maps InfoWindows
  const style = document.createElement('style');
  style.innerHTML = '.gm-ui-hover-effect { display: none !important; }';
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
  function loadKmlRoute(kmlUrl, polylineColor, fitBounds = false) {
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
          strokeOpacity: 1,
          strokeWeight: 4,
          map,
          zIndex: 2,
        });
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
          let iconOpts = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#fff", // Hollow center
            fillOpacity: 1,
            strokeColor: polylineColor, // Border matches line
            strokeWeight: 4,
            scale: i === 0 ? 6 : 4,
          };

          // End marker as X
          if (i === pointPMs.length - 1) {
            iconOpts = {
              path: "M -0.7,-0.7 L 0.7,0.7 M 0.7,-0.7 L -0.7,0.7",
              strokeColor: polylineColor,
              strokeWeight: 6,
              scale: 8,
              strokeOpacity: 1,
            };
          }
          // Detect role prefix in name (e.g., START - Oakland)
          let role = null;
          let displayName = name;
          const roleIconMap = {
            'START': 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            'END': 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            'HOTEL': 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            'CAMP': {
  path: "M12 2C11.45 2 11 2.45 11 3V4.18L4.21 18.36C3.91 18.97 4.37 19.7 5.06 19.7H18.94C19.63 19.7 20.09 18.97 19.79 18.36L13 4.18V3C13 2.45 12.55 2 12 2ZM12 6.6L17.19 17.7H6.81L12 6.6Z",
  fillColor: "#FF9800",
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: "#333",
  scale: 1.5,
  anchor: new google.maps.Point(12, 19)
},
            'FOOD': 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            'DRINK': 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
          };
          const prefixMatch = name.match(/^(START|END|HOTEL|CAMP|FOOD|DRINK)\s+-\s+(.*)$/i);
          if (prefixMatch) {
            role = prefixMatch[1].toUpperCase();
            displayName = prefixMatch[2];
          }
          // const markerIcon = role && roleIconMap[role] ? roleIconMap[role] : iconOpts;
          // For now, always use default iconOpts for production deployment.
          const marker = new google.maps.Marker({ position: { lat, lng }, map, title: displayName, icon: iconOpts });
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
    "#D900FF", // Magenta
    "#FF0037", // Crimson
    "#8F00FF", // Violet
    "#00FF00", // Green
    "#B30000", // Dark Red
    "#7300B3", // Purple
    "#004CFF", // Blue
    "#FF006E", // Rose
  ];

  // Populate the route legend with colored borders
  function updateRouteLegend(routeMap, colors) {
    const legendDiv = document.getElementById('route-legend');
    if (!legendDiv) return;
    legendDiv.innerHTML = '';
    Object.entries(routeMap).forEach(([routeNum, data], i) => {
      const color = colors[i % colors.length];
      const span = document.createElement('span');
      span.textContent = data.name;
      span.style.display = 'inline-block';
      span.style.padding = '2px 10px';
      span.style.margin = '0 6px 6px 0';
      span.style.border = `3px solid ${color}`;
      span.style.borderRadius = '8px';
      span.style.fontWeight = 'bold';
      span.style.background = '#fff';
      span.style.color = '#222';
      legendDiv.appendChild(span);
    });
  }

  // Dynamically build download buttons for each route
  async function addRouteDownloadButtons() {
    const table = document.querySelector(".info-table");
    if (!table) return;

    // Remove old route rows if re-running
    Array.from(table.querySelectorAll(".route-download-row")).forEach(row => row.remove());

    // Dynamically fetch available KML and GPX files from the data directory
    // This is a static list for now; in production, you would fetch this from the server or generate it server-side
    const kmlFiles = [
      "01-Oakland-to-Mt-Madonna.kml",
      "02-Campsite-to-Meeting-Point.kml"
    ];
    const gpxFiles = [
      "01-Oakland-to-Mt-Madonna.gpx",
      "02-Campsite-to-Meeting-Point.gpx"
    ];

    // Build a map of routeNum => { kml, gpx, name }
    const routeMap = {};
    kmlFiles.forEach(file => {
      const match = file.match(/^(\d{2})-(.+)\.kml$/);
      if (match) {
        const routeNum = match[1];
        const routeName = match[2].replace(/-/g, ' ');
        if (!routeMap[routeNum]) routeMap[routeNum] = { name: routeName };
        routeMap[routeNum]["kml"] = file;
      }
    });
    gpxFiles.forEach(file => {
      const match = file.match(/^(\d{2})-(.+)\.gpx$/);
      if (match) {
        const routeNum = match[1];
        if (!routeMap[routeNum]) routeMap[routeNum] = {};
        routeMap[routeNum]["gpx"] = file;
      }
    });
    // Update the legend after building the route map
    updateRouteLegend(routeMap, colors);
    // Now render the table rows for each route
    Object.entries(routeMap).forEach(([num, route], i) => {
      if (!route.kml) return;
      const kmlPath = `data/${route.kml}`;
      const gpxPath = route.gpx ? `data/${route.gpx}` : null;
      const tr = document.createElement("tr");
      tr.className = "route-download-row";
      // Label TD
      const labelTd = document.createElement("td");
      labelTd.className = "label";
      // Show human-friendly route name (e.g., 'Oakland to Mt Madonna')
      const friendlyName = route.name.replace(/-/g, ' ');
      labelTd.textContent = friendlyName;
      tr.appendChild(labelTd);

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

// Populate the route legend with colored borders
function updateRouteLegend(routeMap, colors) {
  const legendDiv = document.getElementById('route-legend');
  if (!legendDiv) return;
  legendDiv.innerHTML = '';
  Object.entries(routeMap).forEach(([routeNum, data], i) => {
    const color = colors[i % colors.length];
    const span = document.createElement('span');
    span.textContent = data.name;
    span.style.display = 'inline-block';
    span.style.padding = '2px 10px';
    span.style.margin = '0 6px 6px 0';
    span.style.border = `3px solid ${color}`;
    span.style.borderRadius = '8px';
    span.style.fontWeight = 'bold';
    span.style.background = '#fff';
    span.style.color = '#222';
    legendDiv.appendChild(span);
  });
}

  // --- End of addRouteDownloadButtons ---

  async function loadAllKmlRoutes() {
    // This is a static list for now; in production, fetch from server or manifest
    const kmlFiles = [
      "01-Oakland-to-Mt-Madonna.kml",
      "02-Campsite-to-Meeting-Point.kml"
    ];
    let fitBoundsDone = false;
    kmlFiles.sort().forEach((file, i) => {
      const color = colors[i % colors.length];
      const kmlPath = `data/${file}`;
      loadKmlRoute(kmlPath, color, !fitBoundsDone);
      if (!fitBoundsDone) fitBoundsDone = true;
    });
  }

  await addRouteDownloadButtons();
  await loadAllKmlRoutes();
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inline JS: body tag parsed, running under", location.href);
  console.log("Post-map script: map in DOM:", document.getElementById("map"));
});
