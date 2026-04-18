import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  'building',
  'residential building',
  'industrial structure',
  'military installation',
  'warehouse',
  'vehicle',
  'tent',
  'construction site',
];

export default function ParameterBar({ params, onParamsChange, onAnalyze, isProcessing, disabled }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateParam = (key, value) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="sidebar-section" id="parameters-section">
      <div className="sidebar-section-title">Detection Parameters</div>

      {/* Text Prompt */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label className="slider-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          Text Prompt
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={params.prompt}
            onChange={(e) => updateParam('prompt', e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="e.g. building"
            style={{ width: '100%', paddingRight: 32 }}
            id="input-prompt"
          />
          <Search size={14} style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
          }} />

          {showSuggestions && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              marginTop: 4,
              zIndex: 20,
              boxShadow: 'var(--shadow-lg)',
              maxHeight: 160,
              overflowY: 'auto',
            }}>
              {PROMPT_SUGGESTIONS.filter(s => s !== params.prompt).map(suggestion => (
                <button
                  key={suggestion}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => e.target.style.background = 'var(--bg-hover)'}
                  onMouseOut={(e) => e.target.style.background = 'none'}
                  onMouseDown={() => {
                    updateParam('prompt', suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <Sparkles size={10} style={{ marginRight: 6, verticalAlign: -1, opacity: 0.5 }} />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confidence Threshold */}
      <div className="slider-group" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="slider-header">
          <span className="slider-label">Confidence Threshold</span>
          <span className="slider-value">{(params.confidenceThreshold * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={params.confidenceThreshold}
          onChange={(e) => updateParam('confidenceThreshold', parseFloat(e.target.value))}
          id="slider-confidence"
        />
      </div>

      {/* Min Area */}
      <div className="slider-group" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="slider-header">
          <span className="slider-label">Min Area (px²)</span>
          <span className="slider-value">{params.minArea}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={params.minArea}
          onChange={(e) => updateParam('minArea', parseInt(e.target.value))}
          id="slider-min-area"
        />
      </div>

      {/* Max Area */}
      <div className="slider-group" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="slider-header">
          <span className="slider-label">Max Area (px²)</span>
          <span className="slider-value">{params.maxArea === 0 ? '∞' : params.maxArea}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100000"
          step="500"
          value={params.maxArea}
          onChange={(e) => updateParam('maxArea', parseInt(e.target.value))}
          id="slider-max-area"
        />
      </div>

      {/* Analyze Button */}
      <button
        className="btn btn--primary btn--lg"
        style={{ width: '100%', marginTop: 'var(--space-2)' }}
        onClick={onAnalyze}
        disabled={isProcessing || disabled}
        id="btn-analyze"
      >
        {isProcessing ? (
          <>
            <span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
            Analyzing…
          </>
        ) : (
          <>
            <Search size={16} />
            Analyze Image
          </>
        )}
      </button>
    </div>
  );
}
