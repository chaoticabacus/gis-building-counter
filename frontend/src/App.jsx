import { useState, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSAM } from './hooks/useSAM';
import { useGEE } from './hooks/useGEE';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import StatusBar from './components/Layout/StatusBar';
import SettingsModal from './components/Layout/SettingsModal';
import MapView from './components/Map/MapView';
import UploadZone from './components/Upload/UploadZone';
import ImagePreview from './components/Upload/ImagePreview';
import ParameterBar from './components/Analysis/ParameterBar';
import ResultsPanel from './components/Analysis/ResultsPanel';
import BuildingTable from './components/Analysis/BuildingTable';
import ExportMenu from './components/Export/ExportMenu';
import TimeSlider from './components/Temporal/TimeSlider';
import ComparisonView from './components/Temporal/ComparisonView';
import GrowthChart from './components/Temporal/GrowthChart';

const DEFAULT_PARAMS = {
  prompt: 'building',
  confidenceThreshold: 0.5,
  minArea: 100,
  maxArea: 0,
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const sam = useSAM();
  const gee = useGEE();

  const [activeMode, setActiveMode] = useState('upload');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Map state
  const [coordinates, setCoordinates] = useState(null);
  const [zoom, setZoom] = useState(4);
  const [polygon, setPolygon] = useState(null);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);

  // Temporal state
  const [selectedYears, setSelectedYears] = useState([null, null]);

  // Show image preview when in upload mode and files are selected
  const showImagePreview = activeMode === 'upload' && currentImage;

  // Handle file selection
  const handleFilesSelected = useCallback((files) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setCurrentImage(files[0]);
      sam.clearResults();
    } else {
      setCurrentImage(null);
    }
  }, [sam]);

  // Run analysis
  const handleAnalyze = useCallback(async () => {
    if (!currentImage) return;
    await sam.analyze(currentImage, params);
  }, [currentImage, params, sam]);

  // Temporal analysis
  const handleTemporalAnalyze = useCallback(async (poly, years) => {
    if (!poly || !years[0] || !years[1]) return;
    await gee.analyzeBuildingCount(poly, years[0], years[1]);
  }, [gee]);

  // Polygon drawn on map
  const handlePolygonDrawn = useCallback((poly) => {
    setPolygon(poly);
  }, []);

  return (
    <div className="app-layout" id="app-root">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        samStatus={sam.status}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Sidebar
        activeMode={activeMode}
        onModeChange={setActiveMode}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {/* ──── Upload Mode ──── */}
        {activeMode === 'upload' && (
          <>
            <UploadZone
              onFilesSelected={handleFilesSelected}
              isProcessing={sam.isProcessing}
              disabled={sam.status !== 'connected'}
            />

            <ParameterBar
              params={params}
              onParamsChange={setParams}
              onAnalyze={handleAnalyze}
              isProcessing={sam.isProcessing}
              disabled={!currentImage || sam.status !== 'connected'}
            />

            {sam.error && (
              <div className="card" style={{
                background: 'var(--accent-danger-subtle)',
                border: '1px solid var(--accent-danger)',
                marginBottom: 'var(--space-3)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--accent-danger)',
              }}>
                {sam.error}
              </div>
            )}

            <ResultsPanel results={sam.results} progress={sam.progress} />

            <BuildingTable
              buildings={sam.results?.buildings}
              onBuildingHover={setHoveredBuilding}
            />

            <ExportMenu results={sam.results} />
          </>
        )}

        {/* ──── Map Mode ──── */}
        {activeMode === 'map' && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">Map Analysis</div>
              <p className="text-xs text-secondary" style={{ lineHeight: 1.5 }}>
                Draw an area on the map to capture satellite imagery.
                Use the Temporal tab for building count analysis with pre-computed datasets.
              </p>
            </div>

            {sam.status !== 'connected' && (
              <div className="card" style={{
                background: 'var(--accent-warning-subtle)',
                marginBottom: 'var(--space-3)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--accent-warning)',
              }}>
                Connect SAM 3 in Settings to enable map analysis
              </div>
            )}

            <ParameterBar
              params={params}
              onParamsChange={setParams}
              onAnalyze={() => {}}
              isProcessing={sam.isProcessing}
              disabled={sam.status !== 'connected'}
            />

            <ResultsPanel results={sam.results} progress={sam.progress} />
            <ExportMenu results={sam.results} />
          </>
        )}

        {/* ──── Temporal Mode ──── */}
        {activeMode === 'temporal' && (
          <>
            <TimeSlider
              startYear={2015}
              endYear={2026}
              selectedYears={selectedYears}
              onYearsChange={setSelectedYears}
              availableYears={[2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]}
            />

            <ComparisonView
              polygon={polygon}
              temporalData={gee.temporalData}
              selectedYears={selectedYears}
              isLoading={gee.isLoading}
              onAnalyze={handleTemporalAnalyze}
            />

            {gee.error && (
              <div className="card" style={{
                background: 'var(--accent-danger-subtle)',
                border: '1px solid var(--accent-danger)',
                marginBottom: 'var(--space-3)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--accent-danger)',
              }}>
                {gee.error}
              </div>
            )}

            <GrowthChart
              data={gee.temporalData}
              selectedYears={selectedYears}
            />
          </>
        )}
      </Sidebar>

      {/* ──── Main Content ──── */}
      <main className="app-main" id="main-content">
        {showImagePreview ? (
          <ImagePreview
            imageFile={currentImage}
            results={sam.results}
            onBuildingHover={setHoveredBuilding}
          />
        ) : (
          <MapView
            theme={theme}
            onCoordinatesChange={setCoordinates}
            onZoomChange={setZoom}
            onPolygonDrawn={handlePolygonDrawn}
            mapMode={activeMode}
          />
        )}
      </main>

      <StatusBar
        coordinates={coordinates}
        zoom={zoom}
        processingStatus={sam.isProcessing || gee.isLoading ? 'processing' : 'ready'}
        buildingCount={sam.results?.count || gee.temporalData?.count}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        colabUrl={sam.colabUrl}
        onColabUrlChange={sam.setColabUrl}
        onTestConnection={sam.testConnection}
        samStatus={sam.status}
      />
    </div>
  );
}
