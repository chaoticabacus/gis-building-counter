import { Upload, Map, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const MODES = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'temporal', label: 'Temporal', icon: Clock },
];

export default function Sidebar({ activeMode, onModeChange, collapsed, onToggleCollapse, children }) {
  return (
    <aside className={`sidebar app-sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} id="app-sidebar">
      {!collapsed && (
        <>
          <div className="sidebar-tabs" id="mode-tabs">
            {MODES.map(mode => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  className={`sidebar-tab ${activeMode === mode.id ? 'sidebar-tab--active' : ''}`}
                  onClick={() => onModeChange(mode.id)}
                  id={`tab-${mode.id}`}
                >
                  <Icon size={13} style={{ marginRight: 4, verticalAlign: -1 }} />
                  {mode.label}
                </button>
              );
            })}
          </div>
          <div className="sidebar-content" id="sidebar-content">
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
