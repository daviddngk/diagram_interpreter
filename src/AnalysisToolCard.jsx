import React, { useState } from 'react';
import axios from 'axios';

// Define your backend base URL (can be passed as prop or imported)
const API_BASE_URL = "http://localhost:5000";

export default function AnalysisToolCard({ title, toolId, imageUrl }) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  const runAnalysis = async () => {
    if (!imageUrl) {
      setError("Please upload an image first using the 'Upload Image for Tools' button."); // Updated error message
      setIsOpen(true); // Open the card to show the error
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null); // Clear previous results
    setIsOpen(true); // Open the card when running

    try {
      // Construct the specific endpoint URL based on toolId
      const analysisUrl = `${API_BASE_URL}/analyze/${toolId}`;
      console.log(`Calling analysis endpoint: ${analysisUrl} for image: ${imageUrl}`);

      // --- Actual API Call ---
      const response = await axios.post(analysisUrl, {
        image_url: imageUrl // Send the GCS public URL in the request body
      });
      setResult(response.data); // Set the result state with the data from the backend
      // --- End Actual API Call ---

    } catch (err) {
      console.error(`Error running ${toolId} analysis:`, err);
      // Try to get a more specific error message from the backend response
      const backendErrorMessage = err.response?.data?.error || err.response?.data?.message;
      setError(backendErrorMessage || err.message || `Failed to run ${toolId} analysis.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-md mb-4 shadow-sm overflow-hidden bg-white"> {/* Added bg-white */}
      <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200"> {/* Adjusted header bg and border */}
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center space-x-2">
           <button
             onClick={runAnalysis}
             disabled={isLoading || !imageUrl} // Disable if loading or no image URL yet
             className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150" // Added transition
           >
             {isLoading ? 'Running...' : 'Run'}
           </button>
          <button onClick={toggleOpen} className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors duration-150"> {/* Added padding/hover bg */}
            {/* Simple Chevron Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 text-sm border-t border-gray-200"> {/* Added top border */}
          {isLoading && <p className="text-gray-500 animate-pulse">Loading results...</p>} {/* Added subtle pulse animation */}
          {error && <p className="text-red-600 whitespace-pre-wrap font-medium">Error: {error}</p>} {/* Made error text bolder */}
          {result && !isLoading && (
            <pre className="whitespace-pre-wrap break-words bg-gray-50 p-3 rounded text-xs border border-gray-200 max-h-60 overflow-y-auto"> {/* Added max-height and scroll */}
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
          {!isLoading && !error && !result && <p className="text-gray-400 italic">Click 'Run' to get results.</p>}
        </div>
      )}
    </div>
  );
}
