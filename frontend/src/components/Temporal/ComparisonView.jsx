import { TrendingUp, MapPin, Loader } from 'lucide-react';

export default function ComparisonView({ polygon, temporalData, selectedYears, isLoading, onAnalyze }) {
  if (!polygon) {
    return (
      <div className="sidebar-section" id="comparison-section">
        <div className="sidebar-section-title">Temporal Comparison</div>
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <MapPin size={28} className="empty-state-icon" />
          <div className="text-sm text-secondary">
            Draw a polygon on the map to begin temporal analysis
          </div>
          <div className="text-xs text-tertiary">
            Use the "Draw Area" button, then click to create points
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-section" id="comparison-section">
      <div className="sidebar-section-title">Area Selected</div>

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <MapPin size={14} style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm">
            {polygon.coordinates[0].length - 1} point polygon
          </span>
        </div>
        <div className="text-xs text-tertiary mono">
          Center: {getCentroid(polygon).map(c => c.toFixed(4)).join(', ')}
        </div>
      </div>

      {selectedYears[0] && selectedYears[1] && (
        <button
          className="btn btn--primary"
          style={{ width: '100%', marginBottom: 'var(--space-3)' }}
          onClick={() => onAnalyze(polygon, selectedYears)}
          disabled={isLoading}
          id="btn-temporal-analyze"
        >
          {isLoading ? (
            <>
              <Loader size={14} className="spinner" />
              Querying GEE…
            </>
          ) : (
            <>
              <TrendingUp size={14} />
              Analyze {selectedYears[0]} → {selectedYears[1]}
            </>
          )}
        </button>
      )}

      {!selectedYears[0] && (
        <div className="text-xs text-tertiary" style={{ textAlign: 'center' }}>
          Select a time period above to compare
        </div>
      )}

      {/* Results summary */}
      {temporalData && (
        <div className="animate-slide-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <div className="card stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-card-label">{selectedYears[0]}</span>
              <span className="stat-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {temporalData.startCount ?? '—'}
              </span>
              <span className="text-xs text-tertiary">structures</span>
            </div>
            <div className="card stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-card-label">{selectedYears[1]}</span>
              <span className="stat-card-value stat-card-value--accent" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {temporalData.endCount ?? '—'}
              </span>
              <span className="text-xs text-tertiary">structures</span>
            </div>
          </div>

          {temporalData.builtUpPercent && (
            <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="stat-card-label" style={{ marginBottom: 'var(--space-2)' }}>
                Built-up Area (Dynamic World)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono text-sm text-secondary">
                  {temporalData.builtUpPercent.start?.toFixed(1)}%
                </span>
                <span className="text-xs text-tertiary">→</span>
                <span className="mono text-sm" style={{ color: 'var(--accent-primary)' }}>
                  {temporalData.builtUpPercent.end?.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCentroid(polygon) {
  const coords = polygon.coordinates[0];
  const n = coords.length - 1; // exclude closing point
  let sumLng = 0, sumLat = 0;
  for (let i = 0; i < n; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  return [sumLng / n, sumLat / n];
}
