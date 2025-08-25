import React, { useState, useEffect } from 'react';

const PortMappingModal = ({ isOpen, onClose, equipment }) => {
  const [selectedPort, setSelectedPort] = useState(null);

  // Reset selected port when modal is opened or equipment changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPort(null);
    }
  }, [isOpen]);

  if (!isOpen || !equipment) {
    return null;
  }

  const handleSelectPort = (port) => {
    setSelectedPort(port);
    // In a future step, this will enable placing a marker on the image.
    console.log(`Selected port to map: ${port.label}`);
  };

  // Use front_panel_image, fallback to port_map_image
  const imageUrl = equipment.front_panel_image || equipment.port_map_image;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">
            Map Ports for: {equipment.name} (ID: {equipment.id})
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {/* Body with Port List and Image */}
        <div className="flex-grow flex overflow-hidden">
          {/* Port Selection Panel */}
          <div className="w-80 bg-gray-50 p-4 flex flex-col border-r overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">1. Select a Port</h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedPort ? `Selected: ${selectedPort.label}` : 'Choose a port from the list below.'}
            </p>
            <div className="flex-grow border rounded-md bg-white">
              <ul className="overflow-y-auto h-full">
                {(equipment.ports && equipment.ports.length > 0) ? (
                  equipment.ports.map(port => (
                    <li
                      key={port.id}
                      onClick={() => handleSelectPort(port)}
                      className={`p-3 cursor-pointer hover:bg-indigo-100 border-b last:border-b-0 transition-colors duration-150 ${
                        selectedPort?.id === port.id ? 'bg-indigo-200 font-semibold text-indigo-800' : ''
                      }`}
                    >
                      {port.label}
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-gray-500 italic">No ports defined for this equipment.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Image Viewer */}
          <div className="flex-grow p-4 overflow-auto flex items-center justify-center bg-gray-200 relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Panel for ${equipment.name}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <p className="text-gray-500">No image available for this equipment.</p>
            )}
          </div>
        </div>

        {/* Footer (for future actions) */}
        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortMappingModal;