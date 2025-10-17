import React, { useEffect, useMemo, useRef, useState } from 'react';
import AnalysisPanel from '../components/AnalysisPanel';
import JsonEditor from '../components/JsonEditor';
import { useAnalysis } from './AnalysisContext';
import { useEquipmentLibrary } from './EquipmentLibraryContext';

const AnalyzeView = () => {
  // All state and logic is now consumed from the context.
  const {
    gcsPublicUrl,
    consolidatedData,
    selectedImageFile,
    imagePreviewSrc,
    isUploading,
    uploadError,
    isEditingConsolidatedJson,
    handleFileSelect,
    handleUpload,
    handleCaptureToolOutput,
    handleSaveConsolidatedJson,
    setIsEditingConsolidatedJson,
    isViewingFinalOutput,
    setIsViewingFinalOutput,
    finalOutputData,
    isGeneratingOutput,
    handleGenerateFinalOutput,
  } = useAnalysis();

  // Consume the equipment library context to get the list of equipment
  const { equipmentList } = useEquipmentLibrary();

  const imageRef = useRef(null);
  const [imageMetrics, setImageMetrics] = useState({ naturalWidth: 0, naturalHeight: 0 });
  const [showCoords, setShowCoords] = useState(false);
  const [mouseCoords, setMouseCoords] = useState(null);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  const toggleCoordinateMode = () => {
    setShowCoords((prev) => {
      const next = !prev;
      if (!next) {
        setMouseCoords(null);
      }
      return next;
    });
  };

  const handleMouseMove = (event) => {
    if (!showCoords || !imageRef.current) {
      return;
    }

    const bounds = imageRef.current.getBoundingClientRect();
    const naturalWidth = imageRef.current.naturalWidth || bounds.width;
    const naturalHeight = imageRef.current.naturalHeight || bounds.height;

    if (!bounds.width || !bounds.height) {
      return;
    }

    const scaleX = naturalWidth / bounds.width;
    const scaleY = naturalHeight / bounds.height;
    const relativeX = (event.clientX - bounds.left) * scaleX;
    const relativeY = (event.clientY - bounds.top) * scaleY;

    const clampedX = Math.max(0, Math.min(naturalWidth, Math.round(relativeX)));
    const clampedY = Math.max(0, Math.min(naturalHeight, Math.round(relativeY)));

    setMouseCoords({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    if (showCoords) {
      setMouseCoords(null);
    }
  };

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageMetrics({ naturalWidth, naturalHeight });
  };

  const edgeTraceData = consolidatedData?.edge_trace_cv;
  const highlightableConnections = useMemo(() => {
    if (!edgeTraceData || !Array.isArray(edgeTraceData.connections)) {
      return [];
    }
    return edgeTraceData.connections.filter(
      (conn) => Array.isArray(conn.path) && conn.path.length > 1
    );
  }, [edgeTraceData]);

  useEffect(() => {
    if (!highlightEnabled) {
      setSelectedConnectionId('');
      return;
    }

    if (highlightableConnections.length === 0) {
      setHighlightEnabled(false);
      setSelectedConnectionId('');
      return;
    }

    const hasCurrentSelection = highlightableConnections.some(
      (conn) => String(conn.id) === String(selectedConnectionId)
    );
    if (!hasCurrentSelection) {
      setSelectedConnectionId(String(highlightableConnections[0].id));
    }
  }, [highlightEnabled, highlightableConnections, selectedConnectionId]);

  const selectedConnection = useMemo(() => {
    if (!highlightEnabled) {
      return null;
    }
    return highlightableConnections.find(
      (conn) => String(conn.id) === String(selectedConnectionId)
    );
  }, [highlightEnabled, highlightableConnections, selectedConnectionId]);

  const highlightPolyline = useMemo(() => {
    if (!selectedConnection || !Array.isArray(selectedConnection.path)) {
      return '';
    }
    return selectedConnection.path.map((pt) => `${pt.x},${pt.y}`).join(' ');
  }, [selectedConnection]);

  useEffect(() => {
    if (highlightEnabled && highlightableConnections.length === 0) {
      setHighlightEnabled(false);
    }
  }, [highlightEnabled, highlightableConnections]);

  const toggleHighlight = () => {
    if (!highlightableConnections.length) {
      return;
    }
    setHighlightEnabled((prev) => !prev);
  };

  const handleRequestEditConsolidatedJson = () => {
    if (Object.keys(consolidatedData).length > 1 || consolidatedData.diagramIQ_metadata?.gcsImageUrl) {
        setIsEditingConsolidatedJson(true);
    } else {
        alert("Please upload an image and run at least one analysis tool to capture data before editing.");
    }
  };

  return (
    <>
      <main className="flex flex-1 overflow-hidden p-4 space-x-4">
        {/* Left Column: File Upload and Image Preview */}
        <div className="w-3/5 flex flex-col space-y-4 overflow-y-auto bg-white p-6 rounded-lg shadow">
          <div className="space-y-3">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                Select Diagram Image:
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {selectedImageFile && !gcsPublicUrl && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedImageFile.name}`}
              </button>
            )}
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
            {gcsPublicUrl && <p className="text-sm text-green-600">Image uploaded. Ready for analysis.</p>}
          </div>
          {imagePreviewSrc && (
            <div className="border rounded-lg p-2 bg-gray-50 shadow-sm">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Image Preview</h2>
              <div className="relative flex justify-center">
                <img
                  ref={imageRef}
                  src={imagePreviewSrc}
                  alt="Preview"
                  className="max-h-[70vh] w-auto rounded"
                  onLoad={handleImageLoad}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
                {highlightEnabled && highlightPolyline && imageMetrics.naturalWidth > 0 && imageMetrics.naturalHeight > 0 && (
                  <div className="absolute inset-0 pointer-events-none flex justify-center">
                    <svg
                      className="w-full h-full"
                      viewBox={`0 0 ${imageMetrics.naturalWidth} ${imageMetrics.naturalHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <polyline
                        points={highlightPolyline}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={Math.max(2, imageMetrics.naturalWidth / 800)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {selectedConnection?.path?.length ? (
                        <>
                          <circle
                            cx={selectedConnection.path[0].x}
                            cy={selectedConnection.path[0].y}
                            r={Math.max(4, imageMetrics.naturalWidth / 400)}
                            fill="#22c55e"
                            stroke="#14532d"
                            strokeWidth={1}
                          />
                          <circle
                            cx={selectedConnection.path[selectedConnection.path.length - 1].x}
                            cy={selectedConnection.path[selectedConnection.path.length - 1].y}
                            r={Math.max(4, imageMetrics.naturalWidth / 400)}
                            fill="#f97316"
                            stroke="#7c2d12"
                            strokeWidth={1}
                          />
                        </>
                      ) : null}
                    </svg>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCoordinateMode}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      showCoords ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    x/y
                  </button>
                  <button
                    type="button"
                    onClick={toggleHighlight}
                    disabled={!highlightableConnections.length}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      highlightEnabled
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${!highlightableConnections.length ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    Highlight
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {highlightEnabled && (
                    highlightableConnections.length ? (
                      <>
                        <label className="text-xs font-medium text-gray-600" htmlFor="highlight-connection-select">
                          Connection
                        </label>
                        <select
                          id="highlight-connection-select"
                          value={selectedConnectionId}
                          onChange={(event) => setSelectedConnectionId(event.target.value)}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {highlightableConnections.map((conn) => (
                            <option key={conn.id} value={String(conn.id)}>
                              #{conn.id} · {conn.path_length ? `${conn.path_length} px` : `${conn.path.length} pts`}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">No traced connections available.</span>
                    )
                  )}
                  {showCoords && (
                    <div className="ml-3 min-w-[140px] rounded border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-mono text-gray-800 text-right">
                      X: {mouseCoords ? mouseCoords.x : '--'} , Y: {mouseCoords ? mouseCoords.y : '--'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!imagePreviewSrc && (
            <div className="flex-grow flex items-center justify-center text-gray-400">
              <p>Upload an image to begin.</p>
            </div>
          )}
        </div>

        {/* Right Column: Analysis Panel */}
        <div className="w-2/5 shrink-0">
          <AnalysisPanel
            imageFile={selectedImageFile}
            imageUrl={gcsPublicUrl}
            consolidatedData={consolidatedData}
            onCaptureData={handleCaptureToolOutput}
            equipmentLibrary={equipmentList}
            isGeneratingOutput={isGeneratingOutput}
            onGenerateFinalOutput={handleGenerateFinalOutput}
            onRequestEditConsolidatedData={handleRequestEditConsolidatedJson}
          />
        </div>
      </main>

      {isEditingConsolidatedJson && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
             <JsonEditor
                initialJsonObject={consolidatedData}
                onSave={handleSaveConsolidatedJson}
                onCancel={() => setIsEditingConsolidatedJson(false)}
                toolTitle="Context Data Editor"
             />
          </div>
        </div>
      )}

      {isViewingFinalOutput && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
             <JsonEditor
                initialJsonObject={finalOutputData}
                onSave={() => setIsViewingFinalOutput(false)} // Just close on save
                onCancel={() => setIsViewingFinalOutput(false)}
                toolTitle="Final Output"
             />
          </div>
        </div>
      )}
    </>
  );
};

export default AnalyzeView;
