export default function StatusBar({ coordinates, zoom, processingStatus, buildingCount }) {
  return (
    <footer className="statusbar app-statusbar" id="app-statusbar">
      <div className="statusbar-section">
        {coordinates && (
          <span className="statusbar-item mono">
            {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
          </span>
        )}
        {zoom !== undefined && (
          <span className="statusbar-item mono">
            z{zoom.toFixed(1)}
          </span>
        )}
      </div>

      <div className="statusbar-section">
        {processingStatus && (
          <span className="statusbar-item">
            <span className={`status-dot status-dot--${processingStatus === 'processing' ? 'loading' : 'connected'}`} />
            {processingStatus === 'processing' ? 'Processing…' : 'Ready'}
          </span>
        )}
        {buildingCount !== null && buildingCount !== undefined && (
          <span className="statusbar-item mono">
            {buildingCount} structures detected
          </span>
        )}
      </div>
    </footer>
  );
}
