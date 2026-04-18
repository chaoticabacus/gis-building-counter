import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function GrowthChart({ data, selectedYears }) {
  if (!data || !data.timeSeries || data.timeSeries.length === 0) {
    return null;
  }

  const { timeSeries } = data;
  const maxValue = Math.max(...timeSeries.map(d => d.value), 1);
  const minValue = Math.min(...timeSeries.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  // Calculate growth statistics
  const stats = useMemo(() => {
    if (timeSeries.length < 2) return null;
    const first = timeSeries[0];
    const last = timeSeries[timeSeries.length - 1];
    const change = last.value - first.value;
    const percentChange = first.value > 0 ? (change / first.value) * 100 : 0;
    return { change, percentChange, first, last };
  }, [timeSeries]);

  const chartHeight = 120;
  const chartWidth = 260;
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  // Build SVG path
  const points = timeSeries.map((d, i) => ({
    x: padding.left + (i / Math.max(timeSeries.length - 1, 1)) * plotW,
    y: padding.top + plotH - ((d.value - minValue) / range) * plotH,
  }));

  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  ).join(' ');

  // Area fill path
  const areaD = pathD +
    ` L ${points[points.length - 1].x.toFixed(1)} ${padding.top + plotH}` +
    ` L ${points[0].x.toFixed(1)} ${padding.top + plotH} Z`;

  return (
    <div className="sidebar-section" id="growth-chart-section">
      <div className="sidebar-section-title">Growth Analysis</div>

      {/* Growth stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <div className="card stat-card">
            <span className="stat-card-label">Change</span>
            <span className={`stat-card-delta ${stats.change >= 0 ? 'stat-card-delta--positive' : 'stat-card-delta--negative'}`}
              style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
              {stats.change >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(0)}
            </span>
          </div>
          <div className="card stat-card">
            <span className="stat-card-label">% Change</span>
            <span className={`stat-card-delta ${stats.percentChange >= 0 ? 'stat-card-delta--positive' : 'stat-card-delta--negative'}`}
              style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
              {stats.percentChange >= 0 ? '+' : ''}{stats.percentChange.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* SVG Chart */}
      <div className="card" style={{ padding: 'var(--space-2)' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + plotH * (1 - pct)}
              x2={padding.left + plotW}
              y2={padding.top + plotH * (1 - pct)}
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 0.5, 1].map((pct) => (
            <text
              key={pct}
              x={padding.left - 5}
              y={padding.top + plotH * (1 - pct) + 3}
              textAnchor="end"
              fill="var(--text-tertiary)"
              fontSize="7"
              fontFamily="var(--font-mono)"
            >
              {Math.round(minValue + range * pct)}
            </text>
          ))}

          {/* X-axis labels */}
          {timeSeries.filter((_, i) => i === 0 || i === timeSeries.length - 1 || i === Math.floor(timeSeries.length / 2)).map((d, elIdx) => {
            const origIdx = timeSeries.indexOf(d);
            return (
              <text
                key={elIdx}
                x={padding.left + (origIdx / Math.max(timeSeries.length - 1, 1)) * plotW}
                y={chartHeight - 4}
                textAnchor="middle"
                fill="var(--text-tertiary)"
                fontSize="7"
                fontFamily="var(--font-mono)"
              >
                {d.year}
              </text>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="var(--accent-primary)" opacity="0.1" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="var(--bg-primary)"
              stroke="var(--accent-primary)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
