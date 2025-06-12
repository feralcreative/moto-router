console.log("Inline JS: head tag parsed");

window.initMap = function () {
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

  // --- Dynamic Route Loader ---
  const allPoints = [];
  const fetches = [];
  for (let i = 1; i <= 99; i++) {
    const num = i.toString().padStart(2, '0');
    const kmlUrl = `data/route-${num}.kml`;
    const fetchPromise = fetch(kmlUrl)
      .then((res) => {
        if (!res.ok) throw { notFound: true, url: kmlUrl, status: res.status };
        return res.text();
      })
      .then((kmlText) => {
        const xmlIdx = kmlText.indexOf("<?xml");
        const cleanText = xmlIdx >= 0 ? kmlText.slice(xmlIdx) : kmlText;
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(cleanText, "application/xml");
        const ns = kmlDoc.documentElement.namespaceURI;
        const exactEls = kmlDoc.getElementsByTagNameNS(ns, "coordinates");
        const wildEls = kmlDoc.getElementsByTagNameNS("*", "coordinates");
        const tagEls = kmlDoc.getElementsByTagName("coordinates");
        const coordsEls = exactEls.length ? exactEls : wildEls.length ? wildEls : tagEls;
        if (!coordsEls || coordsEls.length === 0) return;
        const coordText = coordsEls[0].textContent.trim();
        const path = coordText
          .split(/\s+/)
          .map((pair) => {
            const [lng, lat] = pair.split(",").map(Number);
            return { lat, lng };
          })
          .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));
        if (!path.length) return;
        allPoints.push(...path);
        const colors = ["#0074D9", "#FF4136", "#2ECC40", "#FF851B", "#B10DC9", "#FFDC00", "#001f3f", "#39CCCC", "#01FF70", "#F012BE"];
        const color = colors[(i - 1) % colors.length];
        new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: 1,
          strokeWeight: 4,
          map,
          zIndex: 2 + i,
        });
      })
      .catch((err) => {
        if (err && err.notFound) return;
        console.error(err);
      });
    fetches.push(fetchPromise);
  }
  Promise.all(fetches).then(() => {
    if (allPoints.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("Inline JS: body tag parsed, running under", location.href);
  console.log("Post-map script: map in DOM:", document.getElementById("map"));
});
