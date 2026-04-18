import { Sun, Moon, Settings, Crosshair } from 'lucide-react';
import { useState } from 'react';

export default function Header({ theme, toggleTheme, samStatus, onOpenSettings }) {
  return (
    <header className="header app-header" id="app-header">
      <div className="header-left">
        <div className="header-logo">
          <Crosshair size={18} />
          <span>GIS Counter</span>
        </div>
        <div className="header-divider" />
        <SamStatusBadge status={samStatus} />
      </div>

      <div className="header-right">
        <button
          className="btn btn--icon"
          onClick={onOpenSettings}
          title="Settings"
          id="btn-settings"
        >
          <Settings size={16} />
        </button>
        <button
          className="btn btn--icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="btn-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

function SamStatusBadge({ status }) {
  const labels = {
    connected: 'SAM 3 Connected',
    disconnected: 'SAM 3 Offline',
    loading: 'Connecting…',
    error: 'Connection Error',
  };

  const badgeClass = {
    connected: 'badge--success',
    disconnected: '',
    loading: 'badge--warning',
    error: 'badge--danger',
  };

  return (
    <div className={`badge ${badgeClass[status] || ''}`} id="sam-status-badge">
      <span className={`status-dot status-dot--${status}`} />
      <span>{labels[status] || 'Unknown'}</span>
    </div>
  );
}
