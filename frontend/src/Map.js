import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN';
mapboxgl.accessToken = token;
if (!token || token === 'YOUR_MAPBOX_ACCESS_TOKEN') {
  console.warn('Mapbox token is missing. Set NEXT_PUBLIC_MAPBOX_TOKEN or MAPBOX_TOKEN for Docker compose.');
}

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