import { useState, useCallback } from 'react';
import { Download, FileJson, Table, Image as ImageIcon, ChevronDown } from 'lucide-react';

export default function ExportMenu({ results, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const exportGeoJSON = useCallback(async () => {
    if (!results) return;
    setExporting('geojson');

    try {
      const features = results.buildings.map((b, i) => ({
        type: 'Feature',
        properties: {
          id: b.id,
          confidence: b.confidence,
          area_px: b.area,
        },
        geometry: {
          type: 'Point',
          coordinates: [b.centroid.x, b.centroid.y],
        },
      }));

      const geojson = {
        type: 'FeatureCollection',
        properties: {
          total_count: results.count,
          analysis_date: new Date().toISOString(),
          prompt: results.prompt || 'building',
        },
        features,
      };

      downloadJSON(geojson, `buildings_${Date.now()}.geojson`);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  }, [results]);

  const exportCSV = useCallback(async () => {
    if (!results) return;
    setExporting('csv');

    try {
      const headers = ['ID', 'Confidence', 'Area_px', 'Center_X', 'Center_Y'];
      const rows = results.buildings.map(b =>
        [b.id, b.confidence.toFixed(4), b.area, b.centroid.x, b.centroid.y].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      downloadText(csv, `buildings_${Date.now()}.csv`, 'text/csv');
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  }, [results]);

  const exportAnnotatedImage = useCallback(async () => {
    if (!results) return;
    setExporting('image');

    try {
      // Grab the canvas content from the image preview
      const canvas = document.querySelector('#image-preview canvas');
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `annotated_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  }, [results]);

  if (!results || results.count === 0) return null;

  return (
    <div className="sidebar-section" id="export-section">
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn--secondary"
          style={{ width: '100%' }}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          id="btn-export"
        >
          <Download size={14} />
          Export Results
          <ChevronDown size={12} style={{ marginLeft: 'auto' }} />
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 20,
            overflow: 'hidden',
          }}>
            <ExportOption
              icon={FileJson}
              label="GeoJSON"
              description="Spatial data format"
              onClick={exportGeoJSON}
              loading={exporting === 'geojson'}
            />
            <ExportOption
              icon={Table}
              label="CSV"
              description="Spreadsheet format"
              onClick={exportCSV}
              loading={exporting === 'csv'}
            />
            <ExportOption
              icon={ImageIcon}
              label="Annotated Image"
              description="PNG with overlays"
              onClick={exportAnnotatedImage}
              loading={exporting === 'image'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExportOption({ icon: Icon, label, description, onClick, loading }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        width: '100%',
        padding: '10px var(--space-3)',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-sm)',
        transition: 'background var(--transition-fast)',
      }}
      onClick={onClick}
      disabled={loading}
      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
    >
      <Icon size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{description}</div>
      </div>
    </button>
  );
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text, filename, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
