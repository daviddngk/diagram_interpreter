import React, { createContext, useState, useCallback, useContext } from 'react';

const API_BASE_URL = "http://localhost:5000";

const AnalysisContext = createContext();

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};

const initialConsolidatedData = {
  diagramIQ_metadata: {
    version: "1.0",
    createdAt: new Date().toISOString(),
  },
};

export const AnalysisProvider = ({ children }) => {
  // State for the core persistent data
  const [gcsPublicUrl, setGcsPublicUrl] = useState('');
  const [consolidatedData, setConsolidatedData] = useState(initialConsolidatedData);

  // State for the file upload process
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // State for the JSON editor modal
  const [isEditingConsolidatedJson, setIsEditingConsolidatedJson] = useState(false);

  // --- Logic moved from AnalyzeView ---

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewSrc(URL.createObjectURL(file));
      setUploadError(null);
      // Reset state for the new image
      setConsolidatedData({
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
    if (!selectedImageFile) {
      setUploadError("No image selected to upload.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    try {
      const signedUrlResponse = await fetch(`${API_BASE_URL}/generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedImageFile.name,
          contentType: selectedImageFile.type,
        }),
      });

      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json();
        throw new Error(errorData.error || 'Failed to get signed URL.');
      }
      const { signedUrl, publicUrl } = await signedUrlResponse.json();

      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedImageFile.type },
        body: selectedImageFile,
      });

      setGcsPublicUrl(publicUrl);
      setConsolidatedData(prevData => ({
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleCaptureToolOutput = useCallback((toolId, dataToCapture) => {
    setConsolidatedData(prevData => ({
      ...prevData,
      [toolId.replace('-', '_')]: dataToCapture,
      diagramIQ_metadata: {
        ...prevData.diagramIQ_metadata,
        updatedAt: new Date().toISOString(),
      }
    }));
  }, []);

  const handleSaveConsolidatedJson = useCallback((updatedJson) => {
    setConsolidatedData(prevData => ({
      ...updatedJson,
      diagramIQ_metadata: {
        ...(updatedJson.diagramIQ_metadata || prevData.diagramIQ_metadata),
        updatedAt: new Date().toISOString(),
      }
    }));
    setIsEditingConsolidatedJson(false);
  }, []);

  const value = {
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
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

