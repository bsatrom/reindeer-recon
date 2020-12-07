<style>
  #map {
    width: 100%;
    height: 80%;
  }

  #map:before {
    box-shadow: 20px 0 10px -10px rgba(0, 0, 0, 0.15) inset;
    content: '';
    height: 100%;
    left: 0;
    position: absolute;
    width: 20px;
  }

  .reindeerMarker {
    display: block;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    padding: 0;
  }
</style>

<script>
  import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
  import { onMount } from 'svelte';
  import { accessToken, apiKey, apiUrl } from './consts';

  let startingCoords = [135, 90];
  let homeCoords = [-97.616640625, 30.5193875];
  let reindeerLocations = [];

  let mapRef;


  const reindeerIcon = document.createElement('div');
  reindeerIcon.className = 'reindeerMarker';
  reindeerIcon.style.backgroundImage = 'url(assets/dasher.png)';
  reindeerIcon.style.width = '72px';
  reindeerIcon.style.height = '72px';
  reindeerIcon.style.transition = 'transform ease-in-out 0.5s';

  onMount(async () => {
    mapboxgl.accessToken = accessToken;

    mapRef = new mapboxgl.Map({
      container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: startingCoords,
    zoom: 1
    });

    // Add zoom and rotation controls to the map.
    mapRef.addControl(new mapboxgl.NavigationControl());

    const reindeerMarker = new mapboxgl.Marker(reindeerIcon);

    mapRef.on('load', async function() {
      mapRef.flyTo({center:homeCoords, zoom: 13});

      await sleep(4000);

      fetch(`${apiUrl}?code=${apiKey}`)
        .then(r => r.json())
        .then(data => {
          let locations = data
            .sort((first, second) => first.capture_time - second.capture_time)
            .map(point => [point.lon, point.lat]);
          console.log(locations);

          reindeerLocations = locations;

          mapRef.addSource('route', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'geometry': {
            'type': 'LineString',
              'coordinates': locations
              }
            }
          });
          mapRef.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#b30000',
                'line-width': 4
            }
          });

          let currentIndex = 0;
          const numLocations = reindeerLocations.length;
          let last;

          function animateReindeer(timestamp) {
            if (last === undefined) last = timestamp;
            const elapsed = timestamp - last;

            if (elapsed > 1000) {
              reindeerMarker.setLngLat(locations[currentIndex]);
              reindeerMarker.addTo(mapRef);

              if (currentIndex+1 < numLocations) {
                currentIndex++;
              } else {
                currentIndex = 0;
              }
              last = timestamp;
            }
            requestAnimationFrame(animateReindeer);
          }

          requestAnimationFrame(animateReindeer);
        });
    });

    var popup = new mapboxgl.Popup({ offset: 25 }).setText(
      'The Satrom Boys'
    );

    new mapboxgl.Marker()
      .setLngLat(homeCoords)
      .setPopup(popup)
      .addTo(mapRef);
  });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
</script>

<div id="map"></div>