import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useGEE() {
  const [isLoading, setIsLoading] = useState(false);
  const [temporalData, setTemporalData] = useState(null);
  const [error, setError] = useState(null);

  // Query building footprints within a polygon
  const getBuildingFootprints = useCallback(async (polygon, year = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/temporal/buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon, year }),
      });

      if (!res.ok) throw new Error(`GEE query failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get built-up area time series
  const getTemporalTimeSeries = useCallback(async (polygon, startYear, endYear) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/temporal/landcover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygon,
          start_year: startYear,
          end_year: endYear,
        }),
      });

      if (!res.ok) throw new Error(`GEE query failed: ${res.statusText}`);
      const data = await res.json();
      setTemporalData(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get satellite imagery composite for a date range
  const getSatelliteImagery = useCallback(async (polygon, dateRange) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/temporal/imagery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polygon, date_range: dateRange }),
      });

      if (!res.ok) throw new Error(`Imagery fetch failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTemporalData = useCallback(() => {
    setTemporalData(null);
    setError(null);
  }, []);

  return {
    isLoading,
    temporalData,
    error,
    getBuildingFootprints,
    getTemporalTimeSeries,
    getSatelliteImagery,
    clearTemporalData,
  };
}
