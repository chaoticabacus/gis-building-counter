// MapLibre GL style definitions for dark and light modes

export const darkMapStyle = {
  version: 8,
  name: 'Dark',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    },
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm-tiles',
      layout: { visibility: 'visible' },
    },
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite-tiles',
      layout: { visibility: 'none' },
    },
  ],
};

export const lightMapStyle = {
  version: 8,
  name: 'Light',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    },
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm-tiles',
      layout: { visibility: 'visible' },
    },
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite-tiles',
      layout: { visibility: 'none' },
    },
  ],
};

export function getMapStyle(theme) {
  return theme === 'dark' ? darkMapStyle : lightMapStyle;
}
