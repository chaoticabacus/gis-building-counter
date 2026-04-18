import { TrendingUp, MapPin, Loader, Database, Globe } from 'lucide-react';

const SOURCE_LABELS = {
  google_open_buildings_temporal_v1: 'Google Open Buildings (Temporal)',
  google_open_buildings_v3: 'Google Open Buildings V3',
  overture_maps: 'Overture Maps / Microsoft',
  overture_maps_cli: 'Overture Maps',
  dynamic_world_v1: 'Dynamic World (Built-up Area %)',
};

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

  const hasYears = selectedYears[0] && selectedYears[1];
  const sourceLabel = temporalData?.source ? SOURCE_LABELS[temporalData.source] || temporalData.source : null;

  // Calculate change stats
  const startCount = temporalData?.startCount;
  const endCount = temporalData?.endCount;
  const hasChange = startCount != null && endCount != null && startCount > 0;
  const changeAbs = hasChange ? endCount - startCount : null;
  const changePct = hasChange ? ((changeAbs / startCount) * 100).toFixed(1) : null;

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

      {hasYears && (
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
              Querying building data…
            </>
          ) : (
            <>
              <TrendingUp size={14} />
              Count Buildings {selectedYears[0]} → {selectedYears[1]}
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
          {/* Data source badge */}
          {sourceLabel && (
            <div className="card" style={{
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
            }}>
              <Database size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span className="text-xs text-secondary">{sourceLabel}</span>
            </div>
          )}

          {/* Building count cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <div className="card stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-card-label">{selectedYears[0]}</span>
              <span className="stat-card-value" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {startCount != null ? startCount.toLocaleString() : '—'}
              </span>
              <span className="text-xs text-tertiary">structures</span>
            </div>
            <div className="card stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-card-label">{selectedYears[1]}</span>
              <span className="stat-card-value stat-card-value--accent" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {endCount != null ? endCount.toLocaleString() : '—'}
              </span>
              <span className="text-xs text-tertiary">structures</span>
            </div>
          </div>

          {/* Change stat */}
          {hasChange && (
            <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
              <div className="stat-card-label" style={{ marginBottom: 'var(--space-2)' }}>
                Change ({selectedYears[0]} → {selectedYears[1]})
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono text-sm" style={{
                  color: changeAbs >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                }}>
                  {changeAbs >= 0 ? '+' : ''}{changeAbs.toLocaleString()} structures
                </span>
                <span className="mono text-sm" style={{
                  color: changeAbs >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                }}>
                  {changeAbs >= 0 ? '+' : ''}{changePct}%
                </span>
              </div>
            </div>
          )}

          {/* Built-up area percentage */}
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

          {/* Feature count */}
          {temporalData.features && temporalData.features.length > 0 && (
            <div className="text-xs text-tertiary" style={{ textAlign: 'center' }}>
              <Globe size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {temporalData.features.length.toLocaleString()} footprints loaded on map
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
