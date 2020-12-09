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
</style>

<script>
  import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
  import turf from 'turf';

  import { onMount } from 'svelte';
  import { accessToken, apiKey, apiUrl } from './consts';

  let startingCoords = [135, 90];
  let homeCoords = [-97.616640625, 30.5193875];
  let reindeerLocations = {};

  let mapRef;

  // Create Icons for Each Reindeer
  const dasherIcon = document.createElement('div');
  dasherIcon.style.backgroundImage = 'url(assets/dasher.png)';
  dasherIcon.style.width = '72px';
  dasherIcon.style.height = '72px';

  const cometIcon = document.createElement('div');
  cometIcon.style.backgroundImage = 'url(assets/comet.png)';
  cometIcon.style.width = '72px';
  cometIcon.style.height = '72px';

  onMount(async () => {
    mapboxgl.accessToken = accessToken;

    // Get Reindeer Data
    const response = await fetch(`${apiUrl}?code=${apiKey}`);
    const data = await response.json();

    const reindeerPoints = data
      .sort((first, second) => first.capture_time - second.capture_time)
      .reduce((previous, next) => {
        previous[next.reindeer] = previous[next.reindeer] || [];

        if (next.lon !== undefined && next.lat !== undefined) {
          previous[next.reindeer].push([next.lon, next.lat]);
        }

        return previous;
      }, Object.create(null));

    console.log(reindeerPoints);

    reindeerLocations = reindeerPoints;

    // Route Data for each Reindeer
    const dasherRoute = createRoute(reindeerLocations.dasher);
    const dasherStartPoint = createStartPoint(reindeerLocations.dasher[0]);
    const cometRoute = createRoute(reindeerLocations.comet);
    const cometStartPoint = createStartPoint(reindeerLocations.comet[0]);

    mapRef = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: startingCoords,
      zoom: 1
    });

    mapRef.addControl(new mapboxgl.NavigationControl());

    // Create a marker for our reindeer
    const dasherMarker = new mapboxgl.Marker(dasherIcon);
    const cometMarker = new mapboxgl.Marker(cometIcon);

    mapRef.on('load', async function() {
      mapRef.flyTo({center:homeCoords, zoom: 13});

      await sleep(4000);

      addRouteToMap('dasher', '#b30000', mapRef, reindeerLocations.dasher);
      addRouteToMap('comet', '#fd9400', mapRef, reindeerLocations.comet);

      // Add Initial Reindeer positions to map
      dasherMarker.setLngLat(reindeerLocations.dasher[0]);
      dasherMarker.addTo(mapRef);
      cometMarker.setLngLat(reindeerLocations.comet[0]);
      cometMarker.addTo(mapRef);

      // Initialize the state for each reindeer via an object that
      // Will be updated with each animation frame
      const dasherState = initializeReindeerState(reindeerLocations.dasher, dasherMarker);
      const cometState = initializeReindeerState(reindeerLocations.comet, cometMarker);

      const reindeerStates = {
        dasherState,
        cometState
      };
      console.log(reindeerStates);

      // Start animation
      const animateReindeer = () => {
        for (const reindeer in reindeerStates) {
          const ds = reindeerStates[reindeer];

          if (ds.pointDistance !== 0) {
            let deerpoint = turf.along(
              ds.currentLine,
              (ds.pointDistance / ds.frames) * ds.currentLineIndex,
              'kilometers'
            );
            ds.marker.setLngLat(deerpoint.geometry.coordinates);
            ds.marker.addTo(mapRef);
          }

          ds.currentLineIndex++;

          if (ds.currentLineIndex > ds.frames) {
            if (ds.countUp) {
              if (ds.coordsIndex+1 == ds.numberOfLocations) {
                ds.countUp = false;
                ds.coordsIndex--;
              } else {
                ds.coordsIndex++;
              }
            } else {
              if (ds.coordsIndex == 0) {
                ds.countUp = true;
                ds.coordsIndex++;
              } else {
                ds.coordsIndex--;
              }
            }

            ds.currentLine = turf.lineString([
              ds.locations[ds.countUp ? ds.coordsIndex-1 : ds.coordsIndex+1],
              ds.locations[ds.coordsIndex]
            ]);
            ds.pointDistance = turf.lineDistance(ds.currentLine, 'kilometers');
            ds.frames = getFramerate(ds.pointDistance);

            ds.currentLineIndex = 0;
          }
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
    const distanceMultiplier = Math.round(pointDistance) > 0 ? Math.round(pointDistance) : 0.25;
    return distanceMultiplier * 60;
  };

  const createRoute = (coords) =>  {
    return {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': coords
          }
        }
      ]
    }
  };

  const createStartPoint = (coords) => {
    return {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'Point',
            'coordinates': coords
          }
        }
      ]
    }
  };

  const initializeReindeerState = (locations, marker) => {
    const ds = {
      locations,
      marker,
      numberOfLocations: locations.length,
      coordsIndex: 0,
      countUp: true,
      currentLine: turf.lineString([locations[0], locations[1]]),
      currentLineIndex: 0
    };
    ds.pointDistance = turf.lineDistance(ds.currentLine, 'kilometers');
    ds.frames = getFramerate(ds.pointDistance);

    return ds;
  };

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