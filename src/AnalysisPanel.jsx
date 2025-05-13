import React, { useState, useCallback } from 'react';
import AnalysisToolCard from './AnalysisToolCard';
import JsonEditor from './JsonEditor'; // Make sure you have created this file

export default function AnalysisPanel({ imageUrl }) {
  const [editingTool, setEditingTool] = useState(null); // Stores { toolId: string, title: string } when editing
  const [analysisDataStore, setAnalysisDataStore] = useState({}); // Stores { [toolId]: jsonData }

  // Define the tools. This could also be moved to a constants file if it grows.
  const tools = [
    { title: 'OCR Results', toolId: 'ocr' },
    { title: 'Node Detection (LLM)', toolId: 'nodes' },
    { title: 'Edge Detection (LLM)', toolId: 'edges' },
    { title: 'Edge Detection (Few Shot LLM)', toolId: 'edges-fewshot' }
    // Add more tools here as needed
    // { title: 'Relationship Analysis', toolId: 'relationships' },
  ];

  const handleEditRequest = useCallback((toolId, title) => {
    if (analysisDataStore[toolId]) {
      setEditingTool({ toolId, title });
    } else {
      // This case should ideally not happen if the edit button only appears when data exists.
      console.warn(`No data available to edit for tool: ${toolId}. Please run the analysis first.`);
      // Optionally, you could show a user-facing message here.
    }
  }, [analysisDataStore]);

  const handleSaveEdits = useCallback((updatedJson) => {
    if (editingTool) {
      setAnalysisDataStore(prevStore => ({
        ...prevStore,
        [editingTool.toolId]: updatedJson,
      }));
      // Note: Logging analysisDataStore immediately after setAnalysisDataStore might not show the updated state
      // due to the asynchronous nature of setState. Use a useEffect to see the updated store if needed,
      // or rely on the next render of AnalysisToolCard.
      setEditingTool(null); // Close the editor
    }
   }, [editingTool]);
 
  const handleCancelEdits = useCallback(() => {
    setEditingTool(null); // Close the editor without saving
  }, []);

  const handleDataReady = useCallback((toolId, data) => {
    setAnalysisDataStore(prevStore => ({
      ...prevStore,
      [toolId]: data,
    }));
  }, []);

  // If a tool is being edited, render the JsonEditor
  if (editingTool && analysisDataStore[editingTool.toolId]) {
    return (
      <div className="h-full w-full bg-gray-50 border-l border-gray-200 flex flex-col">
        {/* The JsonEditor itself should handle its internal padding and layout */}
        <JsonEditor
          initialJsonObject={analysisDataStore[editingTool.toolId]}
          onSave={handleSaveEdits}
          onCancel={handleCancelEdits}
          toolTitle={editingTool.title}
        />
      </div>
    );
  }

  // Otherwise, render the list of AnalysisToolCards
  return (
    <div className="h-full w-full overflow-y-auto p-4 bg-gray-50 border-l border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Analysis Tools</h2>
      {!imageUrl && (
        <p className="text-sm text-gray-500 italic mb-4">
          Upload an image to enable analysis tools.
        </p>
      )}
      {tools.map((tool) => (
        <AnalysisToolCard
          key={tool.toolId}
          title={tool.title}
          toolId={tool.toolId}
          imageUrl={imageUrl}
          jsonData={analysisDataStore[tool.toolId]} // Pass current data for this tool
          onEditRequest={handleEditRequest} // Pass callback to initiate editing
          onDataReady={handleDataReady} // Pass callback for when tool fetches/updates data
        />
      ))}
    </div>
  );
}
