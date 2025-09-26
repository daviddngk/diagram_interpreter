import React, { createContext, useState, useCallback, useContext } from 'react';
import axios from 'axios';

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

  // State for the Final Output modal
  const [isViewingFinalOutput, setIsViewingFinalOutput] = useState(false);
  const [finalOutputData, setFinalOutputData] = useState(null);
  const [isGeneratingOutput, setIsGeneratingOutput] = useState(false);
  const [outputError, setOutputError] = useState(null);

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
      const signedUrlResponse = await axios.post(`${API_BASE_URL}/generate-upload-url`, {
        filename: selectedImageFile.name,
        contentType: selectedImageFile.type,
      });

      const { signedUrl, publicUrl } = signedUrlResponse.data;

      await axios.put(signedUrl, selectedImageFile, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedImageFile.type,
        },
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
      setUploadError(error.response?.data?.error || error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCaptureToolOutput = useCallback((toolId, dataToCapture) => {
    setConsolidatedData(prevData => ({
      ...prevData,
      [toolId.replaceAll('-', '_')]: dataToCapture,
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

  const handleGenerateFinalOutput = useCallback(async () => {
    setIsGeneratingOutput(true);
    setOutputError(null);
    setFinalOutputData(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/tools/generate-final-output`, consolidatedData);
      setFinalOutputData(response.data);
      setIsViewingFinalOutput(true);
    } catch (err) {
      console.error('Failed to generate final output:', err);
      const backendError = err.response?.data?.error || 'An unknown error occurred.';
      setOutputError(backendError);
      alert(`Error generating final output: ${backendError}`);
    } finally {
      setIsGeneratingOutput(false);
    }
  }, [consolidatedData]);

  const value = {
    gcsPublicUrl,
    consolidatedData,
    selectedImageFile,
    imagePreviewSrc,
    isUploading,
    uploadError,
    isEditingConsolidatedJson,
    isViewingFinalOutput,
    finalOutputData,
    isGeneratingOutput,
    outputError,
    handleFileSelect,
    handleUpload,
    handleCaptureToolOutput,
    handleSaveConsolidatedJson,
    setIsEditingConsolidatedJson,
    setIsViewingFinalOutput,
    handleGenerateFinalOutput,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};
