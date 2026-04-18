import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function BuildingTable({ buildings, onBuildingHover, onBuildingSelect }) {
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [expanded, setExpanded] = useState(true);

  if (!buildings || buildings.length === 0) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...buildings].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const dir = sortDir === 'asc' ? 1 : -1;
    return (aVal > bVal ? 1 : aVal < bVal ? -1 : 0) * dir;
  });

  const SortIcon = ({ field }) => {
    if (sortKey !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={10} style={{ verticalAlign: -2 }} />
      : <ChevronDown size={10} style={{ verticalAlign: -2 }} />;
  };

  return (
    <div className="sidebar-section" id="building-table-section">
      <div
        className="sidebar-section-title"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>Building Details ({buildings.length})</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>

      {expanded && (
        <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}># <SortIcon field="id" /></th>
                <th onClick={() => handleSort('confidence')}>Conf <SortIcon field="confidence" /></th>
                <th onClick={() => handleSort('area')}>Area <SortIcon field="area" /></th>
                <th>Center</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr
                  key={b.id}
                  onMouseEnter={() => onBuildingHover?.(b.id - 1)}
                  onMouseLeave={() => onBuildingHover?.(null)}
                  onClick={() => onBuildingSelect?.(b)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ color: 'var(--accent-primary)' }}>{b.id}</td>
                  <td>
                    <span className={`badge ${b.confidence >= 0.7 ? 'badge--success' : b.confidence >= 0.4 ? 'badge--warning' : 'badge--danger'}`}>
                      {(b.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>{b.area > 0 ? b.area.toLocaleString() : '—'}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>
                    {b.centroid.x}, {b.centroid.y}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
