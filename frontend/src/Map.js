import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'; // Sostituisci con il tuo token

function Map() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [12.4964, 41.9028], // Roma
      zoom: 10
    });
    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '400px' }} />;
}

export default Map;