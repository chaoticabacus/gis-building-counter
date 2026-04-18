const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const config = {
      ...options,
      headers: {
        ...options.headers,
      },
    };

    // Don't set Content-Type for FormData — browser handles it
    if (!(options.body instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, config);

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${errorBody || res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return res.json();
    }
    return res.blob();
  }

  // Health check
  health() {
    return this.request('/health');
  }

  // SAM 3 analysis
  analyze(formData) {
    return this.request('/api/analyze', {
      method: 'POST',
      body: formData,
    });
  }

  analyzeBatch(formData) {
    return this.request('/api/analyze/batch', {
      method: 'POST',
      body: formData,
    });
  }

  // Temporal analysis
  getBuildings(polygon, year) {
    return this.request('/api/temporal/buildings', {
      method: 'POST',
      body: JSON.stringify({ polygon, year }),
    });
  }

  getLandcover(polygon, startYear, endYear) {
    return this.request('/api/temporal/landcover', {
      method: 'POST',
      body: JSON.stringify({ polygon, start_year: startYear, end_year: endYear }),
    });
  }

  getImagery(polygon, dateRange) {
    return this.request('/api/temporal/imagery', {
      method: 'POST',
      body: JSON.stringify({ polygon, date_range: dateRange }),
    });
  }

  // Tile capture
  captureTiles(bounds, zoom) {
    return this.request('/api/tiles/capture', {
      method: 'POST',
      body: JSON.stringify({ bounds, zoom }),
    });
  }

  // Export
  exportGeoJSON(results) {
    return this.request('/api/export/geojson', {
      method: 'POST',
      body: JSON.stringify(results),
    });
  }

  exportCSV(results) {
    return this.request('/api/export/csv', {
      method: 'POST',
      body: JSON.stringify(results),
    });
  }

  exportImage(results) {
    return this.request('/api/export/image', {
      method: 'POST',
      body: JSON.stringify(results),
    });
  }
}

export const api = new ApiService();
export default api;
