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

  .dasherMarker {
    display: block;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    padding: 0;
  }
</style>

<script>
  import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
  import turf from 'turf';

  import { onMount } from 'svelte';
  import { accessToken, apiKey, apiUrl } from './consts';

  let startingCoords = [135, 90];
  let homeCoords = [-97.616640625, 30.5193875];
  let reindeerLocations = {};
  let dasherRoute;
  let dasherStartPoint;

  let mapRef;

  // Create Icons for Each Reindeer
  const dasherIcon = document.createElement('div');
  dasherIcon.className = 'reindeerMarker';
  dasherIcon.style.backgroundImage = 'url(assets/dasher.png)';
  dasherIcon.style.width = '72px';
  dasherIcon.style.height = '72px';

  onMount(async () => {
    mapboxgl.accessToken = accessToken;

    // Get Reindeer Data
    const response = await fetch(`${apiUrl}?code=${apiKey}`);
    const data = await response.json();

    const reindeerPoints = data
      .sort((first, second) => first.capture_time - second.capture_time)
      .reduce((previous, next) => {
        previous[next.reindeer] = previous[next.reindeer] || [];

        previous[next.reindeer].push([next.lon, next.lat]);

        return previous;
      }, Object.create(null));

    console.log(reindeerPoints);

    reindeerLocations = reindeerPoints;

    // Route Data for each Reindeer
    dasherRoute = {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': reindeerLocations.dasher
          }
        }
      ]
    };

    dasherStartPoint = {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'Point',
            'coordinates': reindeerLocations.dasher[0]
          }
        }
      ]
    };

    mapRef = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: startingCoords,
      zoom: 1
    });

    mapRef.addControl(new mapboxgl.NavigationControl());

    // Create a marker for our reindeer
    const dasherMarker = new mapboxgl.Marker(dasherIcon);

    mapRef.on('load', async function() {
      mapRef.flyTo({center:homeCoords, zoom: 13});

      await sleep(4000);

      addRouteToMap('dasher', '#b30000', mapRef, reindeerLocations.dasher);

      // Add Dasher's Initial position to the map
      dasherMarker.setLngLat(reindeerLocations.dasher[0]);
      dasherMarker.addTo(mapRef);

      // Set variables
      const numLocations = reindeerLocations.dasher.length;
      let coordsIndex = 0;
      let countUp = true;
      let currentLine = turf.lineString([reindeerLocations.dasher[coordsIndex],
        reindeerLocations.dasher[coordsIndex+1]
      ]);

      // Calculate the distance between the first two points
      let pointDistance = turf.lineDistance(currentLine, 'kilometers');
      let frames = getFramerate(pointDistance);
      let currentLineIndex = 0;

      // Start animation
      const animateReindeer = () => {
        if (pointDistance !== 0) {
          let deerpoint = turf.along(currentLine,
            (pointDistance / frames) * currentLineIndex, 'kilometers');
          dasherMarker.setLngLat(deerpoint.geometry.coordinates);
          dasherMarker.addTo(mapRef);
        }

        currentLineIndex++;

        if (currentLineIndex > frames) {
          if (countUp) {
            if (coordsIndex+1 == numLocations) {
              countUp = false;
              coordsIndex--;
            } else {
              coordsIndex++;
            }
          } else {
            if (coordsIndex == 0) {
              countUp = true;
              coordsIndex++;
            } else {
              coordsIndex--;
            }
          }

          currentLine = turf.lineString([
            reindeerLocations.dasher[countUp ? coordsIndex-1 : coordsIndex+1],
            reindeerLocations.dasher[coordsIndex]
          ]);
          pointDistance = turf.lineDistance(currentLine, 'kilometers');
          frames = getFramerate(pointDistance);

          currentLineIndex = 0;
        }

        requestAnimationFrame(animateReindeer);
      };

      // Start the animation
      requestAnimationFrame(animateReindeer);
    });

    var popup = new mapboxgl.Popup({ offset: 25 }).setText(
      'The Satrom Boys'
    );

    new mapboxgl.Marker()
      .setLngLat(homeCoords)
      .setPopup(popup)
      .addTo(mapRef);
  });

  const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const getFramerate = (pointDistance) => {
    const distanceMultiplier = Math.round(pointDistance) > 0 ? Math.round(pointDistance) : 1;
    return distanceMultiplier * 60;
  }

  const addRouteToMap = (reindeer, color, map, data) => {
    map.addSource(`${reindeer}_route`, {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'geometry': {
        'type': 'LineString',
          'coordinates': data
        }
      }
    });
    map.addLayer({
      'id': `${reindeer}_route`,
      'type': 'line',
      'source': `${reindeer}_route`,
      'layout': {
          'line-join': 'round',
          'line-cap': 'round'
      },
      'paint': {
          'line-color': color,
          'line-width': 4
      }
    });
  };
</script>

<div id="map"></div>