import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
//import { API_BASE_URL } from './config'; //removed - defined locally
const API_BASE_URL = "http://localhost:5000"; // Define API_BASE_URL here

export default function AnalysisToolCard({
  title,
  toolId,
  imageUrl,
  // initiallyCapturedData, // Data for this tool already in consolidatedData (can be used for display if needed)
  onCaptureData,         // Callback to capture latestRunData into consolidatedData
  currentConsolidatedData // The entire consolidatedData, for context
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [latestRunData, setLatestRunData] = useState(null); // Stores the result of the most recent "Run"

  // Effect to clear latestRunData and error when the imageUrl changes (new image uploaded)
  useEffect(() => {
    setLatestRunData(null);
    setError(null);
    setIsExpanded(false);
  }, [imageUrl]);

  const runAnalysis = useCallback(async () => {
    if (!imageUrl) {
      setError("Please upload an image first.");
      setLatestRunData(null);
      setIsExpanded(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLatestRunData(null); // Clear previous run data before new run

    try {
      const analysisUrl = `${API_BASE_URL}/analyze/${toolId}`;
      const payload = { image_url: imageUrl };

      // Add context data if this tool can use it (e.g., few-shot learning)
      if (toolId === 'edges-fewshot' || toolId === 'nodes' || toolId === 'edges') { // Or any other tool that might benefit
        const contextData = {};
        if (currentConsolidatedData?.ocr) {
          contextData.ocr_results = currentConsolidatedData.ocr;
        }
        if (currentConsolidatedData?.nodes) {
          // For edge detection, nodes are crucial context.
          // For node detection itself, it might use OCR.
          contextData.node_results = currentConsolidatedData.nodes;
        }
        // Add other relevant context parts as needed
        if (Object.keys(contextData).length > 0) {
          payload.context_data = contextData;
          console.log(`[${title}] Running with context:`, contextData);
        }
      }
      
      console.log(`[${title}] Calling analysis endpoint: ${analysisUrl} with payload:`, payload);
      const response = await axios.post(analysisUrl, payload);
      
      setLatestRunData(response.data);
      setIsExpanded(true); // Expand to show new data
    } catch (err) {
      console.error(`Error running ${title} analysis:`, err);
      const backendErrorMessage = err.response?.data?.error || err.response?.data?.message;
      setError(backendErrorMessage || err.message || `Failed to run ${title} analysis.`);
      setLatestRunData(null);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, toolId, title, currentConsolidatedData]);

  const handleCapture = () => {
    if (latestRunData && onCaptureData) {
      onCaptureData(toolId, latestRunData);
      // Optionally, provide feedback to the user that data has been captured.
      // e.g., a temporary message or change in button appearance.
      console.log(`[${title}] Data captured to DiagramIQ.`);
    }
  };

  return (
    <div className="border rounded-md mb-4 shadow-sm overflow-hidden bg-white">
      <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center space-x-2">
          {latestRunData && !error && (
            <button
              onClick={handleCapture}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-150 font-medium"
              aria-label={`Capture ${title} results to DiagramIQ`}
            >
              Capture
            </button>
          )}
           <button
             onClick={runAnalysis}
             disabled={isLoading || !imageUrl}
             className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
           >
             {isLoading ? 'Running...' : 'Run'}
           </button>
          {latestRunData && ( // Only show expand/collapse if there's data from the latest run
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors duration-150"
              aria-label={isExpanded ? `Collapse ${title} data` : `Expand ${title} data`}
              aria-expanded={isExpanded}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content Area for latest run results, loading, or error messages */}
      {(isExpanded || isLoading || error) && (
        <div className="p-4 text-sm border-t border-gray-200">
          {isLoading && <p className="text-gray-500 animate-pulse">Loading results...</p>}
          {error && <p className="text-red-600 whitespace-pre-wrap font-medium">Error: {error}</p>}
          
          {latestRunData && !isLoading && isExpanded && (
            <pre className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded text-xs border border-gray-200 max-h-96 overflow-y-auto">
              {typeof latestRunData === 'string' ? latestRunDatarunData : JSON.stringify(latestRunData, null, 2)}
            </pre>
          )}
          
          {!isLoading && !error && !latestRunData && isExpanded && (
             <p className="text-gray-400 italic">Click 'Run' to get results for this tool.</p>
          )}
        </div>
      )}
       {!isLoading && !error && !latestRunData && !isExpanded && !imageUrl && (
        <p className="p-4 text-xs text-gray-400 italic">Upload an image to enable this tool.</p>
      )}
       {!isLoading && !error && !latestRunData && !isExpanded && imageUrl && (
        <p className="p-4 text-xs text-gray-400 italic">Click 'Run' to analyze.</p>
      )}
    </div>
  );
}
