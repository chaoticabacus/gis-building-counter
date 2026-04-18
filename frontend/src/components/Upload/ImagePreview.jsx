import { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function ImagePreview({ imageFile, results, onBuildingHover }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageData, setImageData] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      setImageData(img);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageData) return;

    const ctx = canvas.getContext('2d');
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate fit-to-view scale
    const fitScale = Math.min(
      rect.width / imageData.width,
      rect.height / imageData.height
    ) * 0.9;

    const effectiveScale = fitScale * scale;
    const cx = rect.width / 2 + offset.x;
    const cy = rect.height / 2 + offset.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.translate(-imageData.width / 2, -imageData.height / 2);

    // Draw image
    ctx.drawImage(imageData, 0, 0);

    // Draw building masks/boxes
    if (results?.boxes) {
      results.boxes.forEach((box, i) => {
        const isHovered = hoveredBuilding === i;
        const confidence = results.scores?.[i] || 0;

        // Box
        ctx.strokeStyle = isHovered ? 'rgba(61, 220, 132, 0.9)' : `rgba(74, 144, 217, ${0.4 + confidence * 0.5})`;
        ctx.lineWidth = isHovered ? 3 / effectiveScale : 2 / effectiveScale;
        ctx.fillStyle = isHovered ? 'rgba(61, 220, 132, 0.2)' : `rgba(74, 144, 217, ${0.1 + confidence * 0.15})`;

        const [x1, y1, x2, y2] = box;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Label
        const label = `#${i + 1}`;
        ctx.font = `${Math.max(10, 12 / effectiveScale)}px Inter, sans-serif`;
        ctx.fillStyle = isHovered ? '#3ddc84' : '#4a90d9';
        ctx.fillText(label, x1 + 2 / effectiveScale, y1 - 4 / effectiveScale);
      });
    }

    ctx.restore();
  }, [imageData, results, scale, offset, hoveredBuilding]);

  // Mouse handlers for pan/zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(10, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Find building under cursor
  const handleCanvasMouseMove = useCallback((e) => {
    handleMouseMove(e);

    if (!results?.boxes || !imageData || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const fitScale = Math.min(rect.width / imageData.width, rect.height / imageData.height) * 0.9;
    const effectiveScale = fitScale * scale;
    const cx = rect.width / 2 + offset.x;
    const cy = rect.height / 2 + offset.y;

    // Convert screen coords to image coords
    const imgX = (e.clientX - rect.left - cx) / effectiveScale + imageData.width / 2;
    const imgY = (e.clientY - rect.top - cy) / effectiveScale + imageData.height / 2;

    let found = null;
    for (let i = results.boxes.length - 1; i >= 0; i--) {
      const [x1, y1, x2, y2] = results.boxes[i];
      if (imgX >= x1 && imgX <= x2 && imgY >= y1 && imgY <= y2) {
        found = i;
        break;
      }
    }

    setHoveredBuilding(found);
    onBuildingHover?.(found);
  }, [results, imageData, scale, offset, handleMouseMove, onBuildingHover]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (!imageFile) {
    return (
      <div className="empty-state" id="image-preview-empty">
        <div className="empty-state-icon">📷</div>
        <div className="text-sm text-secondary">Upload an image to begin analysis</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} id="image-preview">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          background: 'var(--bg-primary)',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Zoom controls */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 10,
      }}>
        <button className="btn btn--secondary btn--sm" onClick={() => setScale(s => Math.min(10, s * 1.3))}>
          <ZoomIn size={14} />
        </button>
        <button className="btn btn--secondary btn--sm" onClick={() => setScale(s => Math.max(0.1, s * 0.7))}>
          <ZoomOut size={14} />
        </button>
        <button className="btn btn--secondary btn--sm" onClick={resetView}>
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Hovered building info */}
      {hoveredBuilding !== null && results?.buildings?.[hoveredBuilding] && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 10px',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-mono)',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)',
        }}>
          <span style={{ color: 'var(--accent-success)' }}>#{hoveredBuilding + 1}</span>
          {' · '}
          <span style={{ color: 'var(--text-secondary)' }}>
            Confidence: {(results.scores[hoveredBuilding] * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
