import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle } from '../../services/mapStyles.js';

export default function MapView({ theme, onCoordinatesChange, onZoomChange, onPolygonDrawn, mapMode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [basemapType, setBasemapType] = useState('streets'); // streets | satellite
  const drawSourceRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(theme),
      center: [42.5, 23.5], // Central between target regions
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('mousemove', (e) => {
      onCoordinatesChange?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('zoomend', () => {
      onZoomChange?.(map.getZoom());
    });

    // Drawing support
    map.on('load', () => {
      // Source for drawn polygons
      map.addSource('draw-polygon', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'draw-polygon-fill',
        type: 'fill',
        source: 'draw-polygon',
        paint: {
          'fill-color': '#4a90d9',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'draw-polygon-line',
        type: 'line',
        source: 'draw-polygon',
        paint: {
          'line-color': '#4a90d9',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // Source for building footprints
      map.addSource('building-footprints', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'building-footprints-fill',
        type: 'fill',
        source: 'building-footprints',
        paint: {
          'fill-color': '#4a90d9',
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'building-footprints-line',
        type: 'line',
        source: 'building-footprints',
        paint: {
          'line-color': '#4a90d9',
          'line-width': 1,
        },
      });

      drawSourceRef.current = true;
    });

    mapRef.current = map;
    onZoomChange?.(map.getZoom());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map style on theme change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom();
    map.setStyle(getMapStyle(theme));
    map.once('styledata', () => {
      map.setCenter(center);
      map.setZoom(zoom);
      // Re-add drawing layers after style change
      if (!map.getSource('draw-polygon')) {
        map.addSource('draw-polygon', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'draw-polygon-fill',
          type: 'fill',
          source: 'draw-polygon',
          paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.15 },
        });
        map.addLayer({
          id: 'draw-polygon-line',
          type: 'line',
          source: 'draw-polygon',
          paint: { 'line-color': '#4a90d9', 'line-width': 2, 'line-dasharray': [2, 2] },
        });
      }
      if (!map.getSource('building-footprints')) {
        map.addSource('building-footprints', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'building-footprints-fill',
          type: 'fill',
          source: 'building-footprints',
          paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.3 },
        });
        map.addLayer({
          id: 'building-footprints-line',
          type: 'line',
          source: 'building-footprints',
          paint: { 'line-color': '#4a90d9', 'line-width': 1 },
        });
      }
      drawSourceRef.current = true;

      // Toggle satellite layer based on current state
      if (basemapType === 'satellite') {
        if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'visible');
        if (map.getLayer('osm-base')) map.setLayoutProperty('osm-base', 'visibility', 'none');
      }
    });
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle polygon drawing via clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      if (!isDrawing) return;

      const newPoints = [...drawPoints, [e.lngLat.lng, e.lngLat.lat]];
      setDrawPoints(newPoints);

      // Update the drawn polygon on map
      if (drawSourceRef.current && map.getSource('draw-polygon')) {
        const coords = newPoints.length > 2
          ? [[...newPoints, newPoints[0]]]
          : newPoints.length === 2
            ? [[...newPoints, newPoints[0]]]
            : [];

        map.getSource('draw-polygon').setData({
          type: 'FeatureCollection',
          features: coords.length ? [{
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: coords },
          }] : [],
        });
      }
    };

    const handleDblClick = (e) => {
      if (!isDrawing || drawPoints.length < 3) return;
      e.preventDefault();

      const polygon = {
        type: 'Polygon',
        coordinates: [[...drawPoints, drawPoints[0]]],
      };

      setIsDrawing(false);
      onPolygonDrawn?.(polygon);
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [isDrawing, drawPoints, onPolygonDrawn]);

  // Toggle basemap
  const toggleBasemap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const newType = basemapType === 'streets' ? 'satellite' : 'streets';
    setBasemapType(newType);

    if (map.getLayer('osm-base') && map.getLayer('satellite')) {
      map.setLayoutProperty('osm-base', 'visibility', newType === 'streets' ? 'visible' : 'none');
      map.setLayoutProperty('satellite', 'visibility', newType === 'satellite' ? 'visible' : 'none');
    }
  }, [basemapType]);

  // Start drawing
  const startDrawing = useCallback(() => {
    setDrawPoints([]);
    setIsDrawing(true);
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = 'crosshair';
    }
    // Clear existing polygon
    if (drawSourceRef.current && mapRef.current?.getSource('draw-polygon')) {
      mapRef.current.getSource('draw-polygon').setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, []);

  // Clear drawing
  const clearDrawing = useCallback(() => {
    setDrawPoints([]);
    setIsDrawing(false);
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = '';
      if (drawSourceRef.current && mapRef.current.getSource('draw-polygon')) {
        mapRef.current.getSource('draw-polygon').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (drawSourceRef.current && mapRef.current.getSource('building-footprints')) {
        mapRef.current.getSource('building-footprints').setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, []);

  // Expose methods to update building footprints on map
  const setBuildingFootprints = useCallback((geojson) => {
    const map = mapRef.current;
    if (!map || !drawSourceRef.current || !map.getSource('building-footprints')) return;
    map.getSource('building-footprints').setData(geojson);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} id="map-container" />

      {/* Map controls overlay */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        gap: 6,
        zIndex: 10,
      }}>
        <button
          className="btn btn--secondary btn--sm"
          onClick={toggleBasemap}
          id="btn-toggle-basemap"
        >
          {basemapType === 'streets' ? '🛰 Satellite' : '🗺 Streets'}
        </button>

        {(mapMode === 'map' || mapMode === 'temporal') && (
          <>
            {!isDrawing ? (
              <button
                className="btn btn--primary btn--sm"
                onClick={startDrawing}
                id="btn-start-draw"
              >
                ✏️ Draw Area
              </button>
            ) : (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  if (drawPoints.length >= 3) {
                    const polygon = {
                      type: 'Polygon',
                      coordinates: [[...drawPoints, drawPoints[0]]],
                    };
                    setIsDrawing(false);
                    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
                    onPolygonDrawn?.(polygon);
                  } else {
                    setIsDrawing(false);
                    if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
                  }
                }}
                id="btn-stop-draw"
              >
                ✓ Finish ({drawPoints.length} pts)
              </button>
            )}
            <button
              className="btn btn--ghost btn--sm"
              onClick={clearDrawing}
              id="btn-clear-draw"
            >
              ✕ Clear
            </button>
          </>
        )}
      </div>

      {/* Drawing instructions */}
      {isDrawing && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)',
        }}>
          Click to add points · Double-click to finish · Min 3 points
        </div>
      )}
    </div>
  );
}
