import { TrendingUp, Clock, Target } from 'lucide-react';

export default function ResultsPanel({ results, progress }) {
  if (!results && progress === 0) {
    return null;
  }

  // Show progress bar while processing
  if (progress > 0 && progress < 100) {
    return (
      <div className="sidebar-section" id="results-section">
        <div className="sidebar-section-title">Analysis Progress</div>
        <div className="card">
          <div className="progress-bar" style={{ marginBottom: 'var(--space-2)' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-tertiary" style={{ textAlign: 'center' }}>
            {progress < 30 ? 'Uploading image…' :
             progress < 80 ? 'Running SAM 3 inference…' :
             'Processing results…'}
          </div>
        </div>
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className="sidebar-section animate-slide-in" id="results-section">
      <div className="sidebar-section-title">Results</div>

      {/* Primary count */}
      <div className="card" style={{ marginBottom: 'var(--space-3)', textAlign: 'center', padding: 'var(--space-6)' }}>
        <div className="stat-card">
          <span className="stat-card-label">Structures Detected</span>
          <span className="stat-card-value stat-card-value--accent" style={{ fontSize: 'var(--font-size-hero)' }}>
            {results.count}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <div className="card stat-card">
          <span className="stat-card-label">
            <Target size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
            Avg Confidence
          </span>
          <span className="stat-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {results.count > 0
              ? `${(results.buildings.reduce((sum, b) => sum + b.confidence, 0) / results.count * 100).toFixed(1)}%`
              : '—'
            }
          </span>
        </div>

        <div className="card stat-card">
          <span className="stat-card-label">
            <Clock size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
            Processing
          </span>
          <span className="stat-card-value" style={{ fontSize: 'var(--font-size-xl)' }}>
            {results.processingTime ? `${results.processingTime.toFixed(1)}s` : '—'}
          </span>
        </div>
      </div>

      {/* Confidence distribution */}
      {results.count > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="stat-card-label" style={{ marginBottom: 'var(--space-2)' }}>Confidence Distribution</div>
          <ConfidenceHistogram scores={results.scores} />
        </div>
      )}
    </div>
  );
}

function ConfidenceHistogram({ scores }) {
  if (!scores || scores.length === 0) return null;

  // Create 10 bins (0-10%, 10-20%, etc.)
  const bins = Array(10).fill(0);
  scores.forEach(s => {
    const idx = Math.min(Math.floor(s * 10), 9);
    bins[idx]++;
  });
  const maxBin = Math.max(...bins, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {bins.map((count, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(count / maxBin) * 100}%`,
            minHeight: count > 0 ? 3 : 1,
            background: i >= 5
              ? 'var(--accent-primary)'
              : i >= 3
                ? 'var(--accent-warning)'
                : 'var(--accent-danger)',
            borderRadius: '2px 2px 0 0',
            opacity: count > 0 ? 1 : 0.2,
            transition: 'height var(--transition-base)',
          }}
          title={`${i * 10}-${(i + 1) * 10}%: ${count} buildings`}
        />
      ))}
    </div>
  );
}
