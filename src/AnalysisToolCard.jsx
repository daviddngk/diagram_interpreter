import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// Define your backend base URL (can be passed as prop or imported)
const API_BASE_URL = "http://localhost:5000";

export default function AnalysisToolCard({ title, toolId, imageUrl, jsonData, onEditRequest, onDataReady }) {
  //console.log(`[AnalysisToolCard] Rendering: title="${title}", toolId="${toolId}". Current jsonData:`, jsonData ? JSON.stringify(jsonData, null, 2) : 'null');

  const [isExpanded, setIsExpanded] = useState(false); // To control the visibility of the JSON data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    if (!imageUrl) {
      setError("Please upload an image first using the 'Upload Image for Tools' button.");
      setIsExpanded(true); // Open the card to show the error
      return;
    }

    setIsLoading(true);
    setError(null);
    // jsonData is managed by the parent, parent will update it via onDataReady.
    // We don't call onDataReady(toolId, null) here to clear, as it might be confusing if an old error is shown with new loading.
    // Parent should handle initial state.

    try {
      const analysisUrl = `${API_BASE_URL}/analyze/${toolId}`;
      // console.log(`Calling analysis endpoint: ${analysisUrl} for image: ${imageUrl}`);

      const response = await axios.post(analysisUrl, {
        image_url: imageUrl // Send the GCS public URL in the request body
      });
      
      onDataReady(toolId, response.data); // Pass data to parent
      setIsExpanded(true); // Expand to show new data
    } catch (err) {
      console.error(`Error running ${toolId} analysis:`, err);
      const backendErrorMessage = err.response?.data?.error || err.response?.data?.message;
      setError(backendErrorMessage || err.message || `Failed to run ${toolId} analysis.`);
      onDataReady(toolId, null); // Clear data in parent on error
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, toolId, title, onDataReady]); // Added title and onDataReady to dependencies

  // Effect to collapse the card if jsonData is cleared externally (e.g., new image uploaded)
  useEffect(() => {
    if (!jsonData) {
      setIsExpanded(false);
      // setError(null); // Optionally clear local error if parent clears data
    }
  }, [jsonData]);

  return (
    <div className="border rounded-md mb-4 shadow-sm overflow-hidden bg-white">
      <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center space-x-2">
          {jsonData && (
            <button
              onClick={() => onEditRequest(toolId, title)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-150 font-medium"
              aria-label={`Edit ${title} JSON`}
            >
              Edit JSON
            </button>
          )}
           <button
             onClick={runAnalysis}
             disabled={isLoading || !imageUrl}
             className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
           >
             {isLoading ? 'Running...' : 'Run'}
           </button>
          {jsonData && ( // Only show expand/collapse if there's data
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

      {/* Content Area: Visible when expanded, or if loading/error occurs during an attempt to load */}
      {(isExpanded || isLoading || error) && (
        <div className="p-4 text-sm border-t border-gray-200">
          {isLoading && <p className="text-gray-500 animate-pulse">Loading results...</p>}
          {error && <p className="text-red-600 whitespace-pre-wrap font-medium">Error: {error}</p>}
          
          {jsonData && !isLoading && isExpanded && ( // Show JSON only if data exists, not loading, and expanded
            <pre className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded text-xs border border-gray-200 max-h-96 overflow-y-auto"> {/* Increased max-h slightly */}
              {typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2)}
            </pre>
          )}
          
          {/* Initial prompt or state when no data, not loading, and no error */}
          {!isLoading && !error && !jsonData && isExpanded && (
             <p className="text-gray-400 italic">Click 'Run' to get results.</p>
          )}
        </div>
      )}
    </div>
  );
}
