import React from 'react';

const BoundingBoxModal = ({ isOpen, onClose, imageUrl, onCaptureData }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Bounding Box (Manual)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-grow flex overflow-hidden">
          {/* Left Panel: Image Viewer */}
          <div className="w-2/3 bg-gray-200 flex items-center justify-center p-4">
            <div className="w-full h-full border-2 border-dashed border-gray-400 flex items-center justify-center">
              <p className="text-gray-500">Image will be rendered here for drawing.</p>
            </div>
          </div>

          {/* Right Panel: BBox List and JSON */}
          <div className="w-1/3 flex flex-col border-l">
            {/* BBox List */}
            <div className="h-1/2 p-4 border-b">
              <h3 className="font-semibold mb-2">Detected Nodes</h3>
              <div className="h-full border-2 border-dashed border-gray-400 flex items-center justify-center">
                <p className="text-gray-500 text-sm text-center">List of bounding boxes will appear here.</p>
              </div>
            </div>
            {/* JSON Viewer */}
            <div className="h-1/2 p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Captured Data (JSON)</h3>
              <div className="flex-grow border-2 border-dashed border-gray-400 flex items-center justify-center">
                <p className="text-gray-500 text-sm text-center">JSON output will appear here.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
            Close
          </button>
          <button
            disabled={true} // Disabled for now
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Capture Nodes
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoundingBoxModal;
