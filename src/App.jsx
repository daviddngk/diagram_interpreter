import React, { useState, useRef, useEffect } from "react"; // Added useEffect
import axios from "axios";
import AnalysisPanel from './AnalysisPanel'; // Import the new panel

// Define your backend base URL
const API_BASE_URL = "http://localhost:5000";

export default function App() {
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Store the actual file object
  const [description, setDescription] = useState(""); // For original "Describe Diagram"
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // URL after successful upload for panel tools
  const [errorInfo, setErrorInfo] = useState(null); // General errors or "Describe" errors
  const [uploadError, setUploadError] = useState(null); // Specific errors for the upload process
  const [isLoadingDescribe, setIsLoadingDescribe] = useState(false); // Loading state for "Describe Diagram"
  const [isUploading, setIsUploading] = useState(false); // Loading state for GCS upload
  const [statusMessage, setStatusMessage] = useState(""); // General user feedback
  const [uploadStatusMessage, setUploadStatusMessage] = useState(""); // Feedback for upload process

  // Use useRef to potentially reset the input value if needed
  const fileInputRef = useRef(null);

  // Effect to clean up Object URLs
  useEffect(() => {
    // This function will be called when the component unmounts or before the effect runs again
    return () => {
      if (imagePreviewSrc && imagePreviewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewSrc);
        // console.log("Revoked Object URL:", imagePreviewSrc); // For debugging
      }
    };
  }, [imagePreviewSrc]); // Dependency array: run effect when imagePreviewSrc changes

  const handleFileChange = (e) => {
    // --- Reset states when a new file is selected ---
    const file = e.target.files[0];

    // Clean up previous object URL before setting a new one
    if (imagePreviewSrc && imagePreviewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewSrc);
    }

    if (!file) {
      setImagePreviewSrc(null);
      setSelectedFile(null);
      // Also clear dependent states
      setDescription("");
      setErrorInfo(null);
      setUploadError(null);
      setStatusMessage("");
      setUploadStatusMessage("");
      setUploadedImageUrl(null);
      return;
    }

    // Store the file object
    setSelectedFile(file);

    // Create and set the new preview URL
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewSrc(objectUrl);

    // Clear previous results and statuses
    setDescription("");
    setErrorInfo(null);
    setUploadError(null);
    setStatusMessage("");
    setUploadStatusMessage("");
    setUploadedImageUrl(null); // Clear previous upload URL
  };

  // --- Original "Describe Diagram" Functionality ---
  const handleDescribeDiagram = async () => {
    if (!selectedFile) {
      setErrorInfo({ message: "No file selected." });
      return;
    }

    setIsLoadingDescribe(true);
    setErrorInfo(null);
    setDescription("");
    setStatusMessage("Preparing analysis..."); // Updated status message

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
         displayError = { message: `Network or upload error: ${err.message}` };
      } else {
        // Other errors (e.g., JS error before request)
        displayError = { message: err.message };
      }
      setErrorInfo(displayError);
      setDescription("");
      setStatusMessage("Operation failed.");
    } finally {
      setIsLoadingDescribe(false);
      // Optional: Reset file input if you want the user to explicitly select again
      // if (fileInputRef.current) {
      //   fileInputRef.current.value = "";
      // }
      // Decide if you want to clear preview/file on error/success
    }
  };

  // --- New Function to Handle GCS Upload for Analysis Panel ---
  const handleUploadForAnalysis = async () => {
    if (!selectedFile) {
      setUploadError("No file selected for upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadedImageUrl(null); // Clear previous URL
    setUploadStatusMessage("Preparing upload...");

    try {
      // 1. Get Signed URL
      setUploadStatusMessage("Getting upload permission...");
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

      // 2. Upload to GCS
      setUploadStatusMessage("Uploading image to secure storage...");
      await axios.put(signedUrl, selectedFile, {
        headers: { "Content-Type": selectedFile.type },
      });

      // 3. Store public URL and update status
      setUploadedImageUrl(publicUrl);
      setUploadStatusMessage("Upload complete. Ready for analysis tools.");

    } catch (err) {
      console.error("Upload error:", err);
      let displayError = "An unexpected upload error occurred.";
      if (err.response?.data?.message) {
        displayError = err.response.data.message;
      } else if (err.message) {
        displayError = err.message;
      }
      setUploadError(displayError);
      setUploadStatusMessage("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Column: File Input, Preview, Describe Diagram */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Diagram Interpreter</h1>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100"
          disabled={isLoadingDescribe || isUploading} // Disable if any operation is running
        />

        {imagePreviewSrc && (
          <div className="mb-4 border rounded-lg p-2 bg-white shadow-sm"> 
            <img
              src={imagePreviewSrc}
              alt="Preview"
              className="max-h-[70vh] w-auto mx-auto" 
            />
          </div>
        )}

        {/* --- Original Describe Diagram Section --- */}
        <div className="mt-4 space-y-3">
          {selectedFile && (
            <button
              onClick={handleDescribeDiagram}
              className={`px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isLoadingDescribe || isUploading} // Disable if describing or uploading
            >
              {isLoadingDescribe ? "Processing..." : "Describe Diagram"}
            </button>
          )}
          {statusMessage && (
             <div className={`text-sm font-medium ${errorInfo ? 'text-red-600' : 'text-gray-700'}`}>
                {statusMessage}
             </div>
          )}
          {description && !isLoadingDescribe && (
            <div className="mt-4 bg-white p-4 rounded shadow border border-gray-200">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Diagram Description</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{description}</p>
            </div>
          )}
          {errorInfo && !isLoadingDescribe && (
            <div className="mt-4 bg-red-50 p-4 rounded shadow border border-red-200">
              <h2 className="text-lg font-semibold mb-2 text-red-700">Error</h2>
              <pre className="overflow-x-auto text-sm text-red-800 whitespace-pre-wrap break-words">
                {typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo.message || errorInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Analysis Panel */}
      <div className="w-1/3 max-w-md flex-shrink-0 h-full border-l border-gray-300 bg-gray-50 flex flex-col"> {/* Added flex flex-col */}
        <div className="p-4 border-b border-gray-200 space-y-3 flex-shrink-0"> {/* Added flex-shrink-0 */}
           <h2 className="text-lg font-semibold text-gray-800">Prepare for Analysis</h2>
           {selectedFile && (
             <button
               onClick={handleUploadForAnalysis}
               className={`w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
               disabled={isUploading || !!uploadedImageUrl || isLoadingDescribe} // Disable if uploading, already uploaded, or describing
             >
               {isUploading ? "Uploading..." : (uploadedImageUrl ? "Image Ready" : "Upload Image for Tools")}
             </button>
           )}
           {uploadStatusMessage && (
             <p className={`text-sm font-medium ${uploadError ? 'text-red-600' : 'text-gray-700'}`}>
               {uploadStatusMessage}
             </p>
           )}
           {uploadError && (
             <p className="text-sm text-red-600 bg-red-100 p-2 rounded border border-red-200">
               Upload Error: {uploadError}
             </p>
           )}
        </div>
        {/* Pass the uploaded URL to the panel - Make this part scrollable */}
        <div className="flex-grow overflow-y-auto"> {/* Added flex-grow and overflow-y-auto */}
            <AnalysisPanel imageUrl={uploadedImageUrl} />
        </div>
      </div>
    </div>
  );
}
