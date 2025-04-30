import React, { useState, useRef } from "react"; // Added useRef
import axios from "axios";

// Define your backend base URL
const API_BASE_URL = "http://localhost:5000";

export default function App() {
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null); // Renamed for clarity
  const [selectedFile, setSelectedFile] = useState(null); // Store the actual file object
  const [description, setDescription] = useState("");
  const [errorInfo, setErrorInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [statusMessage, setStatusMessage] = useState(""); // User feedback

  // Use useRef to potentially reset the input value if needed
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImagePreviewSrc(null);
      setSelectedFile(null);
      return;
    }

    // Store the file object
    setSelectedFile(file);

    // Create and set the preview URL
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewSrc(objectUrl);

    // Clear previous results
    setDescription("");
    setErrorInfo(null);
    setStatusMessage("");

    // Optional: Clean up previous object URL to prevent memory leaks
    // This might interfere if the user re-selects the same file quickly,
    // but generally good practice if not uploading immediately.
    // return () => URL.revokeObjectURL(objectUrl); // Consider lifecycle if needed
  };

  const analyzeDiagram = async () => {
    if (!selectedFile) {
      setErrorInfo({ message: "No file selected." });
      return;
    }

    setIsLoading(true);
    setErrorInfo(null);
    setDescription("");
    setStatusMessage("Preparing upload...");

    try {
      // 1. Get the Signed URL from your backend
      setStatusMessage("Getting upload permission...");
      const signedUrlResponse = await axios.post(
        `${API_BASE_URL}/generate-upload-url`,
        {
          filename: selectedFile.name,
          contentType: selectedFile.type,
        }
      );

      const { signedUrl, publicUrl } = signedUrlResponse.data;

      if (!signedUrl || !publicUrl) {
        throw new Error("Backend did not provide valid upload URLs.");
      }

      // 2. Upload the file directly to GCS using the Signed URL
      setStatusMessage("Uploading image to secure storage...");
      await axios.put(signedUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type, // Crucial header for GCS Signed URL uploads
        },
        // Optional: Add progress tracking here if needed
      });

      // 3. Send the *public GCS URL* to your analysis endpoint
      setStatusMessage("Analyzing diagram...");
      const analysisResponse = await axios.post(`${API_BASE_URL}/analyze`, {
        // Send JSON data now, not FormData
        image_url: publicUrl,
      });

      setDescription(analysisResponse.data.description || "");
      setStatusMessage("Analysis complete.");

    } catch (err) {
      console.error("Operation error:", err);
      let displayError = { message: "An unexpected error occurred." };
      if (err.response && err.response.data) {
        // Error from backend (/generate-upload-url or /analyze)
        displayError = err.response.data;
      } else if (err.request) {
         // Error during GCS upload (err.request exists, err.response might not)
         // Or network error calling backend
         displayError = { message: `Upload or network error: ${err.message}` };
      } else {
        // Other errors (e.g., JS error before request)
        displayError = { message: err.message };
      }
      setErrorInfo(displayError);
      setDescription("");
      setStatusMessage("Operation failed.");
    } finally {
      setIsLoading(false);
      // Optional: Reset file input if you want the user to explicitly select again
      // if (fileInputRef.current) {
      //   fileInputRef.current.value = "";
      // }
      // setImagePreviewSrc(null); // Decide if you want to clear preview on error/success
      // setSelectedFile(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Diagram Interpreter</h1>

      <input
        ref={fileInputRef} // Assign ref
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4 block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100"
        disabled={isLoading} // Disable input during operation
      />

      {imagePreviewSrc && (
        <div className="mb-4">
          <img
            src={imagePreviewSrc}
            alt="Preview"
            className="border p-2 max-h-96 mx-auto" // Added mx-auto for centering
          />
        </div>
      )}

      {/* Display status message */}
      {statusMessage && (
         <div className={`mb-4 text-sm ${errorInfo ? 'text-red-600' : 'text-gray-600'}`}>
            {statusMessage}
         </div>
      )}


      {selectedFile && ( // Button depends on having a file selected now
        <button
          onClick={analyzeDiagram}
          className={`px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          disabled={isLoading} // Disable button during operation
        >
          {isLoading ? "Processing..." : "Describe Diagram"}
        </button>
      )}

      {description && !isLoading && ( // Hide description while loading new one
        <div className="mt-6 bg-gray-100 p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Diagram Description</h2>
          <p className="whitespace-pre-wrap text-sm">{description}</p>
        </div>
      )}

      {errorInfo && !isLoading && ( // Hide error while loading
        <div className="mt-6 bg-red-100 p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2 text-red-700">Error</h2>
          <pre className="overflow-x-auto text-sm text-red-800 whitespace-pre-wrap break-words">
            {typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
