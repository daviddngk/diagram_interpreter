import React, { useState, useCallback } from 'react';
import AnalysisPanel from '../components/AnalysisPanel';
import JsonEditor from '../components/JsonEditor';

const API_BASE_URL = "http://localhost:5000"; // Define API_BASE_URL here

const AnalyzeView = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState('');
  const [gcsPublicUrl, setGcsPublicUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [consolidatedJsonData, setConsolidatedJsonData] = useState({
    diagramIQ_metadata: {
      version: "1.0",
      createdAt: new Date().toISOString(),
    },
  });
  const [isEditingConsolidatedJson, setIsEditingConsolidatedJson] = useState(false);

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedImage(file);
      setImagePreviewSrc(URL.createObjectURL(file));
      setUploadError(null);
      setConsolidatedJsonData({
        diagramIQ_metadata: {
          originalFileName: file.name,
          version: "1.0",
          createdAt: new Date().toISOString(),
        },
      });
      setGcsPublicUrl('');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setUploadError("No image selected to upload.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setGcsPublicUrl('');

    try {
      const signedUrlResponse = await fetch(`${API_BASE_URL}/generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedImage.name,
          contentType: selectedImage.type,
        }),
      });

      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get signed URL.');
      }
      const { signedUrl, publicUrl } = await signedUrlResponse.json();

      const gcsUploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedImage.type },
        body: selectedImage,
      });

      if (!gcsUploadResponse.ok) {
        throw new Error('Failed to upload image to GCS.');
      }

      console.log('Image uploaded successfully to GCS. Public URL:', publicUrl);
      setGcsPublicUrl(publicUrl);
      setConsolidatedJsonData(prevData => ({
        ...prevData,
        diagramIQ_metadata: {
          ...prevData.diagramIQ_metadata,
          gcsImageUrl: publicUrl,
          gcsUploadTimestamp: new Date().toISOString(),
        }
      }));

    } catch (error) {
      console.error('Upload process failed:', error);
      setUploadError(error.message);
      setGcsPublicUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCaptureToolOutput = useCallback((toolId, dataToCapture) => {
    console.log(`[AnalyzeView] Capturing output for tool: ${toolId} into DiagramIQ data`, dataToCapture);
    setConsolidatedJsonData(prevData => {
      const keyForTool = toolId.replace('-', '_');
      return {
        ...prevData,
        [keyForTool]: dataToCapture,
        diagramIQ_metadata: {
          ...prevData.diagramIQ_metadata,
          updatedAt: new Date().toISOString(),
        }
      };
    });
  }, []);

  const handleSaveConsolidatedJson = useCallback((updatedJson) => {
    console.log("[AnalyzeView] Saving updated DiagramIQ data", updatedJson);
    setConsolidatedJsonData(prevData => ({
      ...updatedJson,
      diagramIQ_metadata: {
        ...(updatedJson.diagramIQ_metadata || prevData.diagramIQ_metadata),
        updatedAt: new Date().toISOString(),
      }
    }));
    setIsEditingConsolidatedJson(false);
  }, []);

  const handleRequestEditConsolidatedJson = () => {
    if (Object.keys(consolidatedJsonData).length > 1 || consolidatedJsonData.diagramIQ_metadata?.gcsImageUrl) {
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
            {selectedImage && !gcsPublicUrl && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedImage.name}`}
              </button>
            )}
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
            {gcsPublicUrl && <p className="text-sm text-green-600">Image uploaded. Ready for analysis.</p>}
          </div>
          {imagePreviewSrc && (
            <div className="border rounded-lg p-2 bg-gray-50 shadow-sm">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Image Preview</h2>
              <img
                src={imagePreviewSrc}
                alt="Preview"
                className="max-h-[70vh] w-auto mx-auto rounded"
              />
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
            imageUrl={gcsPublicUrl}
            consolidatedData={consolidatedJsonData}
            onCaptureData={handleCaptureToolOutput}
            onRequestEditConsolidatedData={handleRequestEditConsolidatedJson}
          />
        </div>
      </main>

      {isEditingConsolidatedJson && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
             <JsonEditor
                initialJsonObject={consolidatedJsonData}
                onSave={handleSaveConsolidatedJson}
                onCancel={() => setIsEditingConsolidatedJson(false)}
                toolTitle="DiagramIQ - Consolidated Data Editor"
             />
          </div>
        </div>
      )}
    </>
  );
};

export default AnalyzeView;