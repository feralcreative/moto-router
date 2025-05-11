console.log('Inline JS: head tag parsed');

window.initMap = function () {
  console.log('initMap called');
  const mapDiv = document.getElementById('map');
  const center = { lat: 37.665817, lng: -121.949321 };
  const map = new google.maps.Map(mapDiv, {
    center,
    zoom: 10,
    mapTypeId: 'terrain',
    mapId: 'a14091e53ca43382'
  });
  console.log('Map instance created');

  // --- Redwood Road Closure KML Layer ---
  const redwoodKmlUrl = 'data/2024-redwood-road-closure.kml';
  let redwoodPolyline = null;
  function loadRedwoodKml() {
    fetch(redwoodKmlUrl)
      .then(res => {
        if (!res.ok) throw new Error('Redwood KML fetch error ' + res.status);
        return res.text();
      })
      .then(kmlText => {
        const xmlIdx = kmlText.indexOf('<?xml');
        const cleanText = xmlIdx >= 0 ? kmlText.slice(xmlIdx) : kmlText;
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(cleanText, 'application/xml');
        const ns = kmlDoc.documentElement.namespaceURI;
        let coordsEls = kmlDoc.getElementsByTagNameNS(ns, 'coordinates');
        if ((!coordsEls || coordsEls.length === 0)) coordsEls = kmlDoc.getElementsByTagNameNS('*', 'coordinates');
        if ((!coordsEls || coordsEls.length === 0)) coordsEls = kmlDoc.getElementsByTagName('coordinates');
        if (!coordsEls || coordsEls.length === 0) {
          console.error('No <coordinates> elements found in Redwood KML', kmlDoc);
          return;
        }
        let maxCount = 0;
        let coordEl = coordsEls[0];
        Array.from(coordsEls).forEach(el => {
          const count = el.textContent.trim().split(/\s+/).length;
          if (count > maxCount) {
            maxCount = count;
            coordEl = el;
          }
        });
        const coordText = coordEl.textContent.trim();
        const path = coordText.split(/\s+/).map(pair => {
          const [lng, lat] = pair.split(',').map(Number);
          return { lat, lng };
        }).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
        console.log('[Redwood] Parsed path:', path);
        if (!path.length) {
          console.error('[Redwood] No valid path points parsed!');
          return;
        }
        if (redwoodPolyline) redwoodPolyline.setMap(null);
        function safeGetRedwoodCheckbox() {
          return document.getElementById('toggle-redwood-road');
        }
        function isRedwoodChecked() {
          const cb = safeGetRedwoodCheckbox();
          return cb ? cb.checked : true; // default to true if not found
        }
        redwoodPolyline = new google.maps.Polyline({
          path,
          strokeColor: '#F00', // bright red
          strokeOpacity: 0.8,     // 50% opacity
          strokeWeight: 15,
          map: isRedwoodChecked() ? map : null,
          zIndex: 1
        });
      })
      .catch(err => console.error('Failed to load Redwood KML:', err));
  }
  // Initial load (only after controls exist)
  loadRedwoodKml();
  // Checkbox toggle logic
  const redwoodCb = document.getElementById('toggle-redwood-road');
  if (redwoodCb) {
    redwoodCb.addEventListener('change', () => {
      if (redwoodPolyline) {
        redwoodPolyline.setMap(redwoodCb.checked ? map : null);
      }
    });
  }

  // ... (rest of your map logic, including markers, etc.)
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('Inline JS: body tag parsed, running under', location.href);
  console.log('Post-map script: map in DOM:', document.getElementById('map'));
});
