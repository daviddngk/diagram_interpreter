import React, { useState } from 'react';
import AnalysisToolCard from './AnalysisToolCard';
import EdgeTraceToolCard from './EdgeTraceToolCard';
import BoundingBoxToolCard from './BoundingBoxToolCard';
import BoundingBoxAutoToolCard from './BoundingBoxAutoToolCard';
import EdgeTraceModal from './EdgeTraceModal';
import BoundingBoxModal from './BoundingBoxModal';
// JsonEditor is no longer invoked directly by AnalysisPanel for individual tools

const TOOL_DEFINITIONS = {
  classify: { title: 'Classify Diagram', type: 'analysis' },
  ocr: { title: 'OCR Results', type: 'analysis' },
  nodes: { title: 'Node Detection (LLM)', type: 'analysis' },
  edges: { title: 'Edge Detection (LLM)', type: 'analysis' },
  'edges-fewshot': { title: 'Edge Detection (Few Shot LLM)', type: 'analysis' },
  'port-match-llm': { title: 'Port Match (LLM)', type: 'analysis' },
  'match-edges-cv': { title: 'Edge Matching (CV)', type: 'analysis' },
  'bounding-box-auto': { title: 'Bounding Box (Auto)', type: 'autoBoundingBox' },
  'edge-trace': { title: 'Edge Trace (CV)', type: 'edgeTrace' },
  'bounding-box-manual': { title: 'Bounding Box (Manual)', type: 'boundingBox' },
};

const DEFAULT_PRIMARY_ORDER = ['classify', 'ocr', 'nodes', 'edges', 'bounding-box-auto'];
const DEFAULT_SECONDARY_ORDER = ['edges-fewshot', 'port-match-llm', 'match-edges-cv', 'edge-trace', 'bounding-box-manual'];

export default function AnalysisPanel({
  imageFile, // The raw image file object for local uploads
  imageUrl,
  equipmentLibrary, // The list of equipment from the library
  consolidatedData, // The entire DiagramIQ data object
  isGeneratingOutput, // Prop to know if the final output is being generated
  onGenerateFinalOutput, // Callback to generate the final output
  onCaptureData, // Callback to capture a tool's output into consolidatedData
  onRequestEditConsolidatedData, // Callback to signal App to show the main JsonEditor
}) {
  // State for the Edge Trace modal
  const [isEdgeTraceModalOpen, setIsEdgeTraceModalOpen] = useState(false);
  const [isBoundingBoxModalOpen, setIsBoundingBoxModalOpen] = useState(false);

  const [primaryToolIds, setPrimaryToolIds] = useState(() => [...DEFAULT_PRIMARY_ORDER]);
  const [secondaryToolIds, setSecondaryToolIds] = useState(() => [...DEFAULT_SECONDARY_ORDER]);

  const moveToolWithinSection = (sectionKey, toolId, direction) => {
    const setSection = sectionKey === 'primary' ? setPrimaryToolIds : setSecondaryToolIds;
    setSection((prev) => {
      const index = prev.indexOf(toolId);
      if (index === -1) {
        return prev;
      }
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      next.splice(index, 1);
      next.splice(newIndex, 0, toolId);
      return next;
    });
  };

  const moveToolToSection = (toolId, targetSection) => {
    setPrimaryToolIds((prev) => {
      const filtered = prev.filter((id) => id !== toolId);
      return targetSection === 'primary' ? [...filtered, toolId] : filtered;
    });
    setSecondaryToolIds((prev) => {
      const filtered = prev.filter((id) => id !== toolId);
      return targetSection === 'secondary' ? [...filtered, toolId] : filtered;
    });
  };

  const handleRunEdgeTrace = () => {
    if (imageUrl) {
      setIsEdgeTraceModalOpen(true);
    }
  };

  const handleDrawBoundingBox = () => {
    if (imageUrl) {
      setIsBoundingBoxModalOpen(true);
    }
  };

  // Individual tool editing state and handlers are removed as editing is now centralized.
  // analysisDataStore is removed; data is either local to AnalysisToolCard (for latest run)
  // or part of consolidatedData.

  // The JsonEditor for individual tools is removed from here.
  // App.jsx will now handle rendering JsonEditor for the consolidatedJsonData.

  // Check for the presence of the required data keys to enable the button.
  // The keys use underscores as per the logic in AnalysisContext.
  const canGenerateOutput = 'nodes' in consolidatedData && 'match_edges_cv' in consolidatedData;
  const generateButtonTooltip = canGenerateOutput ? 'Generate the final schema-compliant output' : 'Requires captured data from "Bounding Box (Manual)" and "Edge Matching (CV)" tools.';

  const getCapturedDataForTool = (toolId) => {
    const key = toolId.replaceAll('-', '_');
    return consolidatedData ? consolidatedData[key] : null;
  };

  const renderToolCard = (toolId, reorderControls) => {
    const definition = TOOL_DEFINITIONS[toolId];
    if (!definition) {
      return null;
    }

    if (definition.type === 'analysis') {
      const capturedData = getCapturedDataForTool(toolId);
      return (
        <AnalysisToolCard
          title={definition.title}
          toolId={toolId}
          imageUrl={imageUrl}
          initiallyCapturedData={capturedData}
          onCaptureData={onCaptureData}
          currentConsolidatedData={consolidatedData}
          reorderControls={reorderControls}
        />
      );
    }

    if (definition.type === 'edgeTrace') {
      return (
        <EdgeTraceToolCard
          imageFile={imageFile}
          imageUrl={imageUrl}
          onRunTrace={handleRunEdgeTrace}
          reorderControls={reorderControls}
        />
      );
    }

    if (definition.type === 'autoBoundingBox') {
      return (
        <BoundingBoxAutoToolCard
          imageFile={imageFile}
          imageUrl={imageUrl}
          onCaptureData={onCaptureData}
          currentConsolidatedData={consolidatedData}
          equipmentLibrary={equipmentLibrary}
          reorderControls={reorderControls}
        />
      );
    }

    if (definition.type === 'boundingBox') {
      return (
        <BoundingBoxToolCard
          imageUrl={imageUrl}
          onDraw={handleDrawBoundingBox}
          reorderControls={reorderControls}
        />
      );
    }

    return null;
  };

  const renderSectionTools = (sectionKey, toolIds) => {
    if (!toolIds.length) {
      return (
        <p className="text-sm text-gray-500 italic">No tools assigned to this section.</p>
      );
    }

    const otherSectionKey = sectionKey === 'primary' ? 'secondary' : 'primary';

    return toolIds.map((toolId, index) => {
      const moveToOtherIcon = otherSectionKey === 'primary' ? '⤒' : '⤓';
      const reorderControls = (
        <>
          <button
            type="button"
            onClick={() => moveToolWithinSection(sectionKey, toolId, -1)}
            disabled={index === 0}
            className="h-6 w-6 flex items-center justify-center border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-400 hover:text-gray-800"
            aria-label="Move up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveToolWithinSection(sectionKey, toolId, 1)}
            disabled={index === toolIds.length - 1}
            className="h-6 w-6 flex items-center justify-center border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-400 hover:text-gray-800"
            aria-label="Move down"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => moveToolToSection(toolId, otherSectionKey)}
            className="h-6 w-6 flex items-center justify-center border border-gray-300 rounded hover:border-gray-400 hover:text-gray-800"
            aria-label={otherSectionKey === 'primary' ? 'Move to top section' : 'Move to bottom section'}
            title={otherSectionKey === 'primary' ? 'Move to top section' : 'Move to bottom section'}
          >
            {moveToOtherIcon}
          </button>
        </>
      );

      const toolElement = renderToolCard(toolId, reorderControls);
      if (!toolElement) {
        return null;
      }

      return (
        <div key={toolId} className="mb-4">
          {toolElement}
        </div>
      );
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header for Analysis Tools and Edit Consolidated Data Button */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-gray-800">Analysis Tools</h2>
          <div className="flex space-x-2">
            <button
              onClick={onRequestEditConsolidatedData}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium"
              aria-label="Edit Context Data"
            >
              View/Edit Context Data
            </button>
            <button
              onClick={onGenerateFinalOutput}
              disabled={!canGenerateOutput || isGeneratingOutput}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              aria-label="Generate Final Output"
              title={generateButtonTooltip}
            >
              {isGeneratingOutput ? 'Generating...' : 'Generate Final Output'}
            </button>
          </div>
        </div>
        {!imageUrl && (
          <p className="text-sm text-gray-500 italic">
            Upload an image to enable analysis tools.
          </p>
        )}
      </div>

      {/* Scrollable area for tool cards arranged by sections */}
      <div className="flex-grow overflow-y-auto p-4 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Flow</h3>
            <p className="text-xs text-gray-500">Adjust order with the controls beside each tool.</p>
          </div>
          {renderSectionTools('primary', primaryToolIds)}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Stage</h3>
            <p className="text-xs text-gray-500">Move tools here to stage them separately.</p>
          </div>
          {renderSectionTools('secondary', secondaryToolIds)}
        </section>
      </div>
      <EdgeTraceModal
        isOpen={isEdgeTraceModalOpen}
        onClose={() => setIsEdgeTraceModalOpen(false)}
        imageFile={imageFile}
        imageUrl={imageUrl}
        onCaptureData={onCaptureData}
      />
      <BoundingBoxModal
        isOpen={isBoundingBoxModalOpen}
        onClose={() => setIsBoundingBoxModalOpen(false)}
        imageUrl={imageUrl}
        onCaptureData={onCaptureData}
        consolidatedData={consolidatedData}
        equipmentLibrary={equipmentLibrary}
      />
    </div>
  );
}
