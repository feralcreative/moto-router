/**
 * @fileoverview Interactive map logic for motorcycle ride route pages.
 * @version 00.01
 * @author ziad@feralcreative.co
 * @lastModified 2025.06.15.1429
 *
 * This script initializes a Google Map, loads and parses KML route files,
 * computes route mileage, builds a dynamic legend and download buttons,
 * and manages interactive features for visualizing motorcycle rides.
 *
 * Features:
 * - Loads route data from data/routes.json
 * - Draws colored polylines for each route using KML files
 * - Calculates mileage using Google Maps Geometry API
 * - Generates interactive legend and download buttons for GPX/KML
 * - Supports route highlighting and marker customization
 */
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
    return new Promise((resolve, reject) => {
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
            reject(new Error("No valid path points"));
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
          // --- Calculate total mileage for this route ---
          let totalMeters = 0;
          for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            totalMeters += google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(prev.lat, prev.lng),
              new google.maps.LatLng(curr.lat, curr.lng)
            );
          }
          const totalMiles = totalMeters / 1609.344;
          routePolyline.__mileageMiles = totalMiles;
          // Store polylines and markers in global arrays for table interaction
          if (!window.routePolylines) window.routePolylines = [];
          if (!window.routeMarkers) window.routeMarkers = [];
          if (!window.routeMarkers[currentRouteIndex]) window.routeMarkers[currentRouteIndex] = [];
          window.routePolylines[currentRouteIndex] = routePolyline;
          resolve(totalMiles);
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
          // Precompute cumulative miles for each waypoint
          let waypointCumulativeMiles = [];
          let waypointMilesSinceLastGas = [];
          let lastGasIdx = 0;
          let lastGasMiles = 0;
          let cumulativeMeters = 0;
          for (let i = 0; i < pointPMs.length; i++) {
            // Find the index of this waypoint in the path array
            const pointEl = pointPMs[i].getElementsByTagNameNS(ns, "Point")[0];
            if (!pointEl) {
              waypointCumulativeMiles.push(null);
              waypointMilesSinceLastGas.push(null);
              continue;
            }
            const coordsEl = pointEl.getElementsByTagNameNS(ns, "coordinates")[0];
            if (!coordsEl) {
              waypointCumulativeMiles.push(null);
              waypointMilesSinceLastGas.push(null);
              continue;
            }
            const [lng, lat] = coordsEl.textContent.trim().split(",").map(Number);
            // Find the closest point in the path
            let minIdx = 0,
              minDist = Infinity;
            for (let j = 0; j < path.length; j++) {
              const d = Math.abs(path[j].lat - lat) + Math.abs(path[j].lng - lng);
              if (d < minDist) {
                minDist = d;
                minIdx = j;
              }
            }
            // Sum meters up to this point
            let meters = 0;
            for (let j = 1; j <= minIdx; j++) {
              meters += google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(path[j - 1].lat, path[j - 1].lng),
                new google.maps.LatLng(path[j].lat, path[j].lng)
              );
            }
            const miles = meters / 1609.344;
            waypointCumulativeMiles.push(miles);
            // Detect if this is a GAS stop (or treat first as GAS)
            let nameEl = pointPMs[i].getElementsByTagNameNS(ns, "name")[0];
            let name = nameEl ? nameEl.textContent : "";
            let isGas = false;
            if (i === 0) {
              isGas = true;
            } else {
              const prefixMatch = name.match(/^(MEET|CAMP|GAS|CHARGE|FOOD|HOTEL|DRINKS|COFFEE|POI|VIEW)\s+-\s+(.*)$/i);
              if (prefixMatch && prefixMatch[1].toUpperCase() === "GAS") {
                isGas = true;
              }
            }
            if (isGas) {
              lastGasIdx = i;
              lastGasMiles = miles;
              waypointMilesSinceLastGas.push(0);
            } else {
              waypointMilesSinceLastGas.push(miles - lastGasMiles);
            }
          }

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

            // --- Waypoint Title Mapping ---
            function getWaypointTitle(role) {
              switch ((role || "").toUpperCase()) {
                case "MEET":
                  return "Meeting Point";
                case "GAS":
                  return "Gas Stop";
                case "CAMP":
                  return "Campground";
                case "HOTEL":
                  return "Lodging";
                case "CHARGE":
                  return "EV Charging Stop";
                case "FOOD":
                  return "Meal Stop";
                case "POI":
                  return "Point of Interest";
                case "VIEW":
                  return "Scenic Point";
                case "COFFEE":
                  return "Coffee Shop";
                case "DRINKS":
                  return "Drinks";
                default:
                  return "Waypoint";
              }
            }

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
                  getColoredSvgIcon(iconPath, polylineColor, 0.3),
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
                    content: `<div class='waypoint-tooltip-toprow'><div class='waypoint-tooltip-title'>${getWaypointTitle(
                      role
                    )}</div><div class='waypoint-tooltip-num'><span class='waypoint-tooltip-label'>From Start:</span><span class='waypoint-tooltip-value'>${
                      waypointCumulativeMiles[i] !== null ? waypointCumulativeMiles[i].toFixed(1) + " mi" : "-"
                    }</span></div><div class='waypoint-tooltip-num'><span class='waypoint-tooltip-label'>From Gas:</span><span class='waypoint-tooltip-value'>${
                      waypointMilesSinceLastGas[i] !== null ? waypointMilesSinceLastGas[i].toFixed(1) + " mi" : "-"
                    }</span></div></div><div class='waypoint-tooltip-name'>${displayName}</div>${
                      desc ? `<div class='waypoint-tooltip-desc'>${desc}</div>` : ""
                    }`,
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
              content: `<div class='waypoint-tooltip-toprow'><div class='waypoint-tooltip-title'>${getWaypointTitle(
                role
              )}</div><div class='waypoint-tooltip-num'><span class='waypoint-tooltip-label'>From Start:</span><span class='waypoint-tooltip-value'>${
                waypointCumulativeMiles[i] !== null ? waypointCumulativeMiles[i].toFixed(1) + " mi" : "-"
              }</span></div><div class='waypoint-tooltip-num'><span class='waypoint-tooltip-label'>From Gas:</span><span class='waypoint-tooltip-value'>${
                waypointMilesSinceLastGas[i] !== null ? waypointMilesSinceLastGas[i].toFixed(1) + " mi" : "-"
              }</span></div></div><div class='waypoint-tooltip-name'>${displayName}</div>${
                desc ? `<div class='waypoint-tooltip-desc'>${desc}</div>` : ""
              }`,
              disableAutoPan: false,
              shouldFocus: false,
            });
            marker.addListener("mouseover", () => {
              infowindow.open({ map, anchor: marker });
            });
            marker.addListener("mouseout", () => {
              infowindow.close();
            });
            // Remove click-to-open for desktop, but keep for touch devices
            if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
              marker.addListener("click", () => infowindow.open({ map, anchor: marker }));
            }
          });
        })
        .catch((err) => {
          console.error(`Error loading KML route ${kmlUrl}:`, err);
          reject(err);
        });
    });
  }

  // 12 visually distinct, contrasting colors spaced around the color wheel
  // Dark, high-contrast, visually distinct route colors
  const colors = [
    "#cc0000", // Red
    "#0000cc", // Blue
    "#DD00DD", // Magenta
    "#4A148C", // Purple
    "#00aaaa", // Cyan
    "#FF6F00", // Orange
    "#4E342E", // Brown
    "#006064", // Teal
    "#0D1335", // Dark Blue
    "#A0740B", // Mustard
    "#003300", // Dark Green
    "#550000", // Burgundy
    "#8800DD", // Violet
  ];

  // Populate the route legend with colored borders
  function updateRouteLegend(routes, colors) {
    const legendDiv = document.getElementById("route-legend");
    if (!legendDiv) return;
    legendDiv.innerHTML = "";
    routes.forEach((route, i) => {
      if (!route.kml) return;
      // Human-friendly name from filename
      const match = route.kml.match(/^\d{2}-(.+)\.kml$/);
      const routeName = match ? match[1].replace(/-/g, " ") : route.kml;
      const color = colors[i % colors.length];
      const span = document.createElement("span");
      span.textContent = routeName;
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
    const routes = await resp.json();
    // Now render the table rows for each route
    routes.forEach((route, i) => {
      if (!route.kml) return;
      // Get mileage for this route (if available)
      const mileage =
        window.routePolylines && window.routePolylines[i] ? window.routePolylines[i].__mileageMiles : null;
      const kmlPath = `data/${route.kml}`;
      const gpxPath = route.kml ? `data/${route.kml.replace(/\.kml$/, '.gpx')}` : null;
      const mraUrl = route.mra || "";
      const tr = document.createElement("tr");
      tr.className = "route-download-row";
      // --- Mileage TD ---
      const mileageTd = document.createElement("td");
      mileageTd.className = "route-mileage-cell";
      mileageTd.style.textAlign = "center";
      mileageTd.style.fontWeight = "bold";
      mileageTd.style.minWidth = "60px";
      mileageTd.style.maxWidth = "80px";
      mileageTd.textContent = mileage !== null ? mileage.toFixed(1) + " mi" : "--";

      // Label TD
      const labelTd = document.createElement("td");
      labelTd.className = "label route-label";
      // Show human-friendly route name (e.g., 'Oakland to Mt Madonna')
      let friendlyName = route.name;
      if (!friendlyName && route.kml) {
        const match = route.kml.match(/^\d{2}-(.+)\.kml$/);
        friendlyName = match ? match[1].replace(/-/g, " ") : route.kml;
      }
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
      tr.appendChild(mileageTd);
      // --- Centralized highlight/dim logic ---
      function setRouteHighlight(activeIndex) {
        console.log("setRouteHighlight called with activeIndex:", activeIndex);
        console.log("window.routePolylines:", window.routePolylines);
        console.log("window.routeMarkers:", window.routeMarkers);
        // Polylines
        window.routePolylines.forEach((polyline, idx) => {
          console.log(`Polyline idx=${idx}, activeIndex=${activeIndex}, polyline=`, polyline);
          polyline.setOptions({
            strokeOpacity: activeIndex == null ? 0.6 : idx === activeIndex ? 1.0 : 0.3,
            zIndex: activeIndex == null ? 1 : idx === activeIndex ? 2 : 1,
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
                  url: isActive === null ? cache.full : isActive ? cache.full : cache.dim,
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
            marker.setZIndex(isActive === null ? 1 : isActive ? 2 : 1);
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

      // MRA
      if (mraUrl && typeof mraUrl === "string" && mraUrl.trim() !== "") {
        const mraBtn = document.createElement("a");
        mraBtn.className = "btn btn-sm btn-primary mra-btn";
        mraBtn.href = mraUrl;
        mraBtn.target = "_blank";
        mraBtn.textContent = "MRA";
        btnGroup.appendChild(mraBtn);
      }

      btnTd.appendChild(btnGroup);
      tr.appendChild(btnTd);
      table.appendChild(tr);
    });
  }

  // --- End of addRouteDownloadButtons ---

  async function loadAllKmlRoutes() {
    // Now expects array of objects: [{ kml, mra }]
    const resp = await fetch("data/routes.json");
    const routes = await resp.json();
    let fitBoundsDone = false;
    const promises = routes.map((route, i) => {
      if (!route.kml) return Promise.resolve();
      const color = colors[i % colors.length];
      const kmlPath = `data/${route.kml}`;
      const p = loadKmlRoute(kmlPath, color, !fitBoundsDone, i);
      if (!fitBoundsDone) fitBoundsDone = true;
      return p;
    });
    await Promise.all(promises);
  }

  await loadAllKmlRoutes();
  await addRouteDownloadButtons();

  // Fetch routes again to update the legend (reuse same fetch logic)
  const resp = await fetch("data/routes.json");
  const routes = await resp.json();
  updateRouteLegend(routes, colors);
};

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inline JS: body tag parsed, running under", location.href);
  console.log("Post-map script: map in DOM:", document.getElementById("map"));
});
