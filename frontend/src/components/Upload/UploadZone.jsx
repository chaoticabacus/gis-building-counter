import { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Loader } from 'lucide-react';

export default function UploadZone({ onFilesSelected, isProcessing, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.name.endsWith('.tif') || f.name.endsWith('.tiff')
    );

    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected?.(files);
    }
  }, [onFilesSelected]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected?.(files);
    }
  }, [onFilesSelected]);

  const removeFile = useCallback((index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected?.(newFiles);
  }, [selectedFiles, onFilesSelected]);

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    onFilesSelected?.([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onFilesSelected]);

  return (
    <div className="sidebar-section" id="upload-section">
      <div className="sidebar-section-title">Image Upload</div>

      <div
        className={`upload-zone ${isDragOver ? 'upload-zone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        id="upload-dropzone"
      >
        {isProcessing ? (
          <Loader size={28} className="upload-zone-icon spinner" />
        ) : (
          <Upload size={28} className="upload-zone-icon" />
        )}
        <div className="upload-zone-text">
          {isProcessing ? 'Processing…' : 'Drop satellite images here'}
        </div>
        <div className="upload-zone-hint">
          JPEG, PNG, TIFF · Multiple files supported
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.tif,.tiff"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        id="file-input"
      />

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-2)',
          }}>
            <span className="text-xs text-secondary">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </span>
            <button className="btn btn--ghost btn--sm" onClick={clearAll}>
              Clear all
            </button>
          </div>
          {selectedFiles.map((file, i) => (
            <FileItem key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileItem({ file, onRemove }) {
  const sizeStr = file.size > 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    : `${(file.size / 1024).toFixed(0)} KB`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: 'var(--space-1)',
      background: 'var(--bg-tertiary)',
      fontSize: 'var(--font-size-xs)',
    }}>
      <ImageIcon size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      <span className="truncate" style={{ flex: 1, color: 'var(--text-secondary)' }}>
        {file.name}
      </span>
      <span className="mono" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
        {sizeStr}
      </span>
      <button
        className="btn btn--ghost"
        onClick={onRemove}
        style={{ padding: 2 }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
