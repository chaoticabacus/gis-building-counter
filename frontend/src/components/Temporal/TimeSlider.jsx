import { useState, useMemo } from 'react';

export default function TimeSlider({ startYear, endYear, selectedYears, onYearsChange, availableYears }) {
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | null
  const years = useMemo(() => {
    const result = [];
    for (let y = startYear; y <= endYear; y++) result.push(y);
    return result;
  }, [startYear, endYear]);

  const handleYearClick = (year) => {
    if (!selectedYears[0] || (selectedYears[0] && selectedYears[1])) {
      // Start new selection
      onYearsChange([year, null]);
    } else {
      // Complete selection
      const sorted = [selectedYears[0], year].sort((a, b) => a - b);
      onYearsChange(sorted);
    }
  };

  return (
    <div className="sidebar-section" id="time-slider-section">
      <div className="sidebar-section-title">Time Period</div>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
        }}>
          <span className="text-xs text-tertiary">{startYear}</span>
          <span className="text-xs text-tertiary">{endYear}</span>
        </div>

        {/* Year pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
        }}>
          {years.map(year => {
            const isAvailable = !availableYears || availableYears.includes(year);
            const isSelected = selectedYears.includes(year);
            const isInRange = selectedYears[0] && selectedYears[1] &&
              year >= selectedYears[0] && year <= selectedYears[1];

            return (
              <button
                key={year}
                className={`btn btn--sm ${isSelected ? 'btn--primary' : isInRange ? 'btn--secondary' : 'btn--ghost'}`}
                style={{
                  minWidth: 44,
                  opacity: isAvailable ? 1 : 0.3,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                }}
                onClick={() => isAvailable && handleYearClick(year)}
                disabled={!isAvailable}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected range display */}
      {selectedYears[0] && (
        <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <span className="mono text-sm" style={{ color: 'var(--accent-primary)' }}>
            {selectedYears[0]}
          </span>
          {selectedYears[1] && (
            <>
              <span className="text-xs text-tertiary" style={{ margin: '0 var(--space-2)' }}>→</span>
              <span className="mono text-sm" style={{ color: 'var(--accent-primary)' }}>
                {selectedYears[1]}
              </span>
              <span className="text-xs text-tertiary" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
                {selectedYears[1] - selectedYears[0]} year span
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
