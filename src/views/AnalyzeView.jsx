import React from 'react';
import AnalysisPanel from '../components/AnalysisPanel';
import JsonEditor from '../components/JsonEditor';
import { useAnalysis } from './AnalysisContext';
import { useEquipmentLibrary } from './EquipmentLibraryContext';

const AnalyzeView = () => {
  // All state and logic is now consumed from the context.
  const {
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
    isViewingFinalOutput,
    setIsViewingFinalOutput,
    finalOutputData,
    isGeneratingOutput,
    handleGenerateFinalOutput,
  } = useAnalysis();

  // Consume the equipment library context to get the list of equipment
  const { equipmentList } = useEquipmentLibrary();

  const handleRequestEditConsolidatedJson = () => {
    if (Object.keys(consolidatedData).length > 1 || consolidatedData.diagramIQ_metadata?.gcsImageUrl) {
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
            {selectedImageFile && !gcsPublicUrl && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedImageFile.name}`}
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
            imageFile={selectedImageFile}
            imageUrl={gcsPublicUrl}
            consolidatedData={consolidatedData}
            onCaptureData={handleCaptureToolOutput}
            equipmentLibrary={equipmentList}
            isGeneratingOutput={isGeneratingOutput}
            onGenerateFinalOutput={handleGenerateFinalOutput}
            onRequestEditConsolidatedData={handleRequestEditConsolidatedJson}
          />
        </div>
      </main>

      {isEditingConsolidatedJson && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
             <JsonEditor
                initialJsonObject={consolidatedData}
                onSave={handleSaveConsolidatedJson}
                onCancel={() => setIsEditingConsolidatedJson(false)}
                toolTitle="Context Data Editor"
             />
          </div>
        </div>
      )}

      {isViewingFinalOutput && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
             <JsonEditor
                initialJsonObject={finalOutputData}
                onSave={() => setIsViewingFinalOutput(false)} // Just close on save
                onCancel={() => setIsViewingFinalOutput(false)}
                toolTitle="Final Output"
             />
          </div>
        </div>
      )}
    </>
  );
};

export default AnalyzeView;