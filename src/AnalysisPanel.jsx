import React from 'react';
import AnalysisToolCard from './AnalysisToolCard';
// JsonEditor is no longer invoked directly by AnalysisPanel for individual tools

export default function AnalysisPanel({
  imageUrl,
  consolidatedData, // The entire DiagramIQ data object
  onCaptureData, // Callback to capture a tool's output into consolidatedData
  onRequestEditConsolidatedData, // Callback to signal App to show the main JsonEditor
}) {
  // Define the tools. This could also be moved to a constants file.
  const tools = [
    { title: 'OCR Results', toolId: 'ocr' },
    { title: 'Node Detection (LLM)', toolId: 'nodes' },
    { title: 'Edge Detection (LLM)', toolId: 'edges' },
    { title: 'Edge Detection (Few Shot LLM)', toolId: 'edges-fewshot' },
    // { title: 'Relationship Analysis', toolId: 'relationships' },
  ];

  // Individual tool editing state and handlers are removed as editing is now centralized.
  // analysisDataStore is removed; data is either local to AnalysisToolCard (for latest run)
  // or part of consolidatedData.

  // The JsonEditor for individual tools is removed from here.
  // App.jsx will now handle rendering JsonEditor for the consolidatedJsonData.

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header for Analysis Tools and Edit Consolidated Data Button */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-gray-800">Analysis Tools</h2>
          <button
            onClick={onRequestEditConsolidatedData}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-medium"
            aria-label="Edit DiagramIQ Consolidated Data"
          >
            View/Edit DiagramIQ Data
          </button>
        </div>
        {!imageUrl && (
          <p className="text-sm text-gray-500 italic">
            Upload an image to enable analysis tools.
          </p>
        )}
      </div>

      {/* Scrollable area for tool cards */}
      <div className="flex-grow overflow-y-auto p-4">
        {tools.map((tool) => {
          // Determine the key used in consolidatedData (e.g., 'edges_fewshot' from 'edges-fewshot')
          const toolDataKey = tool.toolId.replace('-', '_');
          const capturedDataForThisTool = consolidatedData ? consolidatedData[toolDataKey] : null;

          return (
            <AnalysisToolCard
              key={tool.toolId}
              title={tool.title}
              toolId={tool.toolId}
              imageUrl={imageUrl}
              // Pass the already captured data for this tool (if any) for context or display
              // The card will primarily manage its own 'latestRunData' for display after a run.
              initiallyCapturedData={capturedDataForThisTool}
              onCaptureData={onCaptureData} // Pass the callback to capture data
              // consolidatedData can be passed if tools need broader context for their "Run" operation
              // For example, few-shot might need OCR and Node results.
              // Let's pass the whole thing for now, AnalysisToolCard can decide what to use.
              currentConsolidatedData={consolidatedData}
            />
          );
        })}
      </div>
    </div>
  );
}
