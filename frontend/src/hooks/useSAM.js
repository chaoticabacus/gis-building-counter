import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_COLAB_URL = '';

export function useSAM() {
  const [colabUrl, setColabUrl] = useState(() => {
    return localStorage.getItem('gis-colab-url') || DEFAULT_COLAB_URL;
  });
  const [status, setStatus] = useState('disconnected'); // connected | disconnected | loading | error
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const healthCheckRef = useRef(null);

  // Persist Colab URL
  useEffect(() => {
    localStorage.setItem('gis-colab-url', colabUrl);
  }, [colabUrl]);

  // Health check polling
  useEffect(() => {
    if (!colabUrl) {
      setStatus('disconnected');
      return;
    }

    const checkHealth = async () => {
      try {
        const res = await fetch(`${colabUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          setStatus('connected');
          setError(null);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('disconnected');
      }
    };

    checkHealth();
    healthCheckRef.current = setInterval(checkHealth, 30000);

    return () => {
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, [colabUrl]);

  // Run inference on a single image
  const analyze = useCallback(async (imageFile, params = {}) => {
    if (!colabUrl || status !== 'connected') {
      setError('SAM 3 is not connected. Check your Colab URL.');
      return null;
    }

    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', params.prompt || 'building');
      formData.append('confidence_threshold', params.confidenceThreshold || 0.5);
      if (params.minArea) formData.append('min_area', params.minArea);
      if (params.maxArea) formData.append('max_area', params.maxArea);

      setProgress(30);

      const res = await fetch(`${colabUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        throw new Error(`Inference failed: ${res.statusText}`);
      }

      const data = await res.json();
      setProgress(100);

      const processedResults = {
        count: data.masks?.length || 0,
        masks: data.masks || [],
        boxes: data.boxes || [],
        scores: data.scores || [],
        buildings: (data.masks || []).map((mask, i) => ({
          id: i + 1,
          area: calculateMaskArea(mask),
          centroid: calculateCentroid(data.boxes[i]),
          confidence: data.scores[i],
          box: data.boxes[i],
        })),
        processingTime: data.processing_time || 0,
        imageWidth: data.image_width,
        imageHeight: data.image_height,
      };

      setResults(processedResults);
      return processedResults;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [colabUrl, status]);

  // Run batch inference
  const analyzeBatch = useCallback(async (imageFiles, params = {}) => {
    const allResults = [];
    for (let i = 0; i < imageFiles.length; i++) {
      setProgress(Math.round((i / imageFiles.length) * 100));
      const result = await analyze(imageFiles[i], params);
      if (result) allResults.push({ file: imageFiles[i].name, ...result });
    }
    return allResults;
  }, [analyze]);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setProgress(0);
  }, []);

  const testConnection = useCallback(async (url) => {
    try {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    colabUrl,
    setColabUrl,
    status,
    isProcessing,
    results,
    error,
    progress,
    analyze,
    analyzeBatch,
    clearResults,
    testConnection,
  };
}

function calculateMaskArea(mask) {
  if (!mask) return 0;
  // If mask is RLE encoded, calculate from it; otherwise estimate from bounding box
  if (typeof mask === 'object' && mask.size) {
    return mask.size[0] * mask.size[1]; // approximate
  }
  return 0;
}

function calculateCentroid(box) {
  if (!box || box.length < 4) return { x: 0, y: 0 };
  return {
    x: Math.round((box[0] + box[2]) / 2),
    y: Math.round((box[1] + box[3]) / 2),
  };
}
