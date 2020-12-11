<style>
  #map {
    width: 100%;
    height: 80%;
    margin-top: 5px;
  }

  #map:before {
    box-shadow: 20px 0 10px -10px rgba(0, 0, 0, 0.15) inset;
    content: '';
    height: 100%;
    left: 0;
    position: absolute;
    width: 20px;
  }

  :global(.sd-spinner-container) {
    margin: auto;
  }

</style>

<script>
  import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
  import turf from 'turf';

  import { onMount } from 'svelte';
  import { accessToken, apiKey, apiUrl } from './consts';
  import { Avatar, Backdrop, Button, Spinner } from 'proi-ui';

  let startingCoords = [135, 90];
  let homeCoords = [-97.616640625, 30.5193875];
  let reindeerLocations = {};

  let mapRef;
  let routesVisible = false;
  let backdropOpen = true;

  const createIcon = (iconName) => {
    const icon = document.createElement('div');
    icon.style.backgroundImage = `url(assets/${iconName}.png)`;
    icon.style.width = '72px';
    icon.style.height = '72px';

    return icon;
  };

  // Create Icons for Each Reindeer
  const dasherIcon = createIcon('dasher');
  const dancerIcon = createIcon('dancer');
  const cometIcon = createIcon('comet');
  const vixenIcon = createIcon('vixen');
  const prancerIcon = createIcon('prancer');

  onMount(async () => {
    mapboxgl.accessToken = accessToken;

    // Get Reindeer Data
    const response = await fetch(`${apiUrl}?code=${apiKey}`);
    const data = await response.json();

    console.log(data);

    reindeerLocations = data;

    // Route Data for each Reindeer
    const dasherRoute = createRoute(reindeerLocations.dasher);
    const dasherStartPoint = createStartPoint(reindeerLocations.dasher[0]);
    const dancerRoute = createRoute(reindeerLocations.dancer);
    const dancerStartPoint = createStartPoint(reindeerLocations.dancer[0]);
    const cometRoute = createRoute(reindeerLocations.comet);
    const cometStartPoint = createStartPoint(reindeerLocations.comet[0]);
    const vixenRoute = createRoute(reindeerLocations.vixen);
    const vixenStartPoint = createStartPoint(reindeerLocations.vixen[0]);
    const prancerRoute = createRoute(reindeerLocations.prancer);
    const prancerStartPoint = createStartPoint(reindeerLocations.prancer[0]);

    mapRef = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: startingCoords,
      zoom: 1
    });

    mapRef.addControl(new mapboxgl.NavigationControl());

    // Create a marker for our reindeer
    const dasherMarker = new mapboxgl.Marker(dasherIcon);
    const dancerMarker = new mapboxgl.Marker(dancerIcon);
    const cometMarker = new mapboxgl.Marker(cometIcon);
    const vixenMarker = new mapboxgl.Marker(vixenIcon);
    const prancerMarker = new mapboxgl.Marker(prancerIcon);

    mapRef.on('load', async function() {
      mapRef.flyTo({center:homeCoords, zoom: 12.5});

      await sleep(4000);
      backdropOpen = false;

      addRouteToMap('dasher', '#b30000', mapRef, reindeerLocations.dasher);
      addRouteToMap('dancer', '#0a61bf', mapRef, reindeerLocations.dancer);
      addRouteToMap('comet', '#fd9400', mapRef, reindeerLocations.comet);
      addRouteToMap('vixen', '#48bb00', mapRef, reindeerLocations.vixen);
      addRouteToMap('prancer', '#7e00c0', mapRef, reindeerLocations.prancer);

      // Add Initial Reindeer positions to map
      dasherMarker.setLngLat(reindeerLocations.dasher[0]);
      dasherMarker.addTo(mapRef);
      dancerMarker.setLngLat(reindeerLocations.dancer[0]);
      dancerMarker.addTo(mapRef);
      cometMarker.setLngLat(reindeerLocations.comet[0]);
      cometMarker.addTo(mapRef);
      vixenMarker.setLngLat(reindeerLocations.vixen[0]);
      vixenMarker.addTo(mapRef);
      prancerMarker.setLngLat(reindeerLocations.prancer[0]);
      prancerMarker.addTo(mapRef);

      // Initialize the state for each reindeer via an object that
      // Will be updated with each animation frame
      const dasherState = initializeReindeerState(reindeerLocations.dasher, dasherMarker);
      const dancerState = initializeReindeerState(reindeerLocations.dancer, dancerMarker);
      const cometState = initializeReindeerState(reindeerLocations.comet, cometMarker);
      const vixenState = initializeReindeerState(reindeerLocations.vixen, vixenMarker);
      const prancerState = initializeReindeerState(reindeerLocations.prancer, prancerMarker);

      const reindeerStates = {
        dasherState,
        dancerState,
        cometState,
        vixenState,
        prancerState
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
            if (ds.coordsIndex+1 == ds.numberOfLocations) {
              ds.coordsIndex = 0;
            }
            ds.coordsIndex++;

            ds.currentLine = turf.lineString([
              ds.locations[ds.coordsIndex-1],
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
    const distanceMultiplier = Math.round(pointDistance) > 0 ? Math.round(pointDistance) : 0.10;
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
          'line-cap': 'round',
          'visibility': routesVisible ? 'visible' : 'none'
      },
      'paint': {
          'line-color': color,
          'line-width': 4,
          'line-opacity': 0.5
      }
    });
  };

  const toggleLayers = () => {
    routesVisible = !routesVisible;

    ['dasher_route', 'dancer_route', 'comet_route', 'vixen_route', 'prancer_route'].forEach(route => {
      const visibility =  mapRef.getLayoutProperty(route, 'visibility');

      // toggle layer visibility by changing the layout object's visibility property
      if (visibility === 'visible') {
        mapRef.setLayoutProperty(route, 'visibility', 'none');
      } else {
        mapRef.setLayoutProperty(route, 'visibility', 'visible');
      }
    });
  }
</script>

<Backdrop open={backdropOpen}>
  <Spinner labeled label="Gathering Intelligence..."/>
</Backdrop>
<Button status="primary" squared on:click="{toggleLayers}">
  {routesVisible? "Hide" : "Show"} Routes
</Button>
<div id="map"></div>