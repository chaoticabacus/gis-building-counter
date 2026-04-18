import { useState } from 'react';
import { X, ExternalLink, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, colabUrl, onColabUrlChange, onTestConnection, samStatus }) {
  const [testUrl, setTestUrl] = useState(colabUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const success = await onTestConnection(testUrl);
    setTestResult(success ? 'success' : 'error');
    setTesting(false);
  };

  const handleSave = () => {
    onColabUrlChange(testUrl);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="settings-modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} id="settings-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Settings</h2>
          <button className="btn btn--icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Colab URL */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label className="slider-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            SAM 3 Colab URL
          </label>
          <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--space-2)' }}>
            Run the SAM 3 Colab notebook, then paste the public tunnel URL here.
          </div>
          <input
            type="url"
            value={testUrl}
            onChange={(e) => {
              setTestUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://your-colab-tunnel-url.ngrok.io"
            style={{ width: '100%', marginBottom: 'var(--space-2)' }}
            id="input-colab-url"
          />

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button
              className="btn btn--secondary btn--sm"
              onClick={handleTest}
              disabled={!testUrl || testing}
            >
              {testing ? (
                <><Loader size={12} className="spinner" /> Testing…</>
              ) : (
                'Test Connection'
              )}
            </button>

            {testResult === 'success' && (
              <span className="badge badge--success">
                <CheckCircle size={12} /> Connected
              </span>
            )}
            {testResult === 'error' && (
              <span className="badge badge--danger">
                <AlertCircle size={12} /> Failed
              </span>
            )}
          </div>
        </div>

        {/* API URL */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label className="slider-label" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
            Backend API URL
          </label>
          <input
            type="url"
            value={import.meta.env.VITE_API_URL || 'http://localhost:8000'}
            disabled
            style={{ width: '100%', opacity: 0.6 }}
          />
          <div className="text-xs text-tertiary" style={{ marginTop: 'var(--space-1)' }}>
            Set via VITE_API_URL environment variable
          </div>
        </div>

        {/* Help link */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--accent-info-subtle)' }}>
          <div className="text-sm" style={{ marginBottom: 'var(--space-1)' }}>
            Need help setting up the Colab notebook?
          </div>
          <a
            href="https://github.com/facebookresearch/sam3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            SAM 3 Repository <ExternalLink size={10} />
          </a>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
