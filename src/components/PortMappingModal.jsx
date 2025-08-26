import React, { useState, useEffect, useRef } from 'react';

const PortMappingModal = ({ isOpen, onClose, equipment, onSave, isSaving }) => {
  const [selectedPort, setSelectedPort] = useState(null);
  // State for coordinates is now split between the reference box and the individual port locations
  const [boundingBox, setBoundingBox] = useState(null); // The reference box for the equipment itself
  const [portCoordinates, setPortCoordinates] = useState({}); // { [portId]: { x, y } } relative to boundingBox
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset selected port when modal is opened or equipment changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPort(null);
      setIsDrawing(false);
      setStartPoint(null);

      // Pre-populate with existing data from the equipment object if it exists
      // This makes the modal re-entrant.
      const initialCoords = {};
      equipment?.ports?.forEach(p => {
        if (p.coordinate_x != null && p.coordinate_y != null) {
          initialCoords[p.id] = { x: p.coordinate_x, y: p.coordinate_y };
        }
      });
      setPortCoordinates(initialCoords);

      // The backend will need to store this field, e.g., as a JSON object
      setBoundingBox(equipment?.port_map_bounding_box || null);
    }
  }, [isOpen, equipment]);

  if (!isOpen || !equipment) {
    return null;
  }

  const getRelativeCoords = (e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    // Clamp coordinates between 0 and 1 to prevent drawing outside the image
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  // --- Bounding Box Drawing Handlers ---
  const handleBoxDrawStart = (e) => {
    if (e.button !== 0) return; // Only left click
    // Allow redraw only if no ports are mapped yet, or provide an explicit "Redraw" button.
    // For now, we prevent redraw if a box already exists to avoid accidental deletion.
    if (boundingBox) return;

    const coords = getRelativeCoords(e);
    if (coords) {
      setStartPoint(coords);
      setIsDrawing(true);
      setBoundingBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  };

  const handleBoxDrawMove = (e) => {
    if (!isDrawing || !startPoint) return;
    const currentCoords = getRelativeCoords(e);
    if (currentCoords) {
      const newBox = {
        x: Math.min(startPoint.x, currentCoords.x),
        y: Math.min(startPoint.y, currentCoords.y),
        width: Math.abs(startPoint.x - currentCoords.x),
        height: Math.abs(startPoint.y - currentCoords.y),
      };
      setBoundingBox(newBox);
    }
  };

  const handleBoxDrawEnd = () => {
    setIsDrawing(false);
    setStartPoint(null);
    if (boundingBox && (boundingBox.width > 0.01 || boundingBox.height > 0.01)) {
      console.log("Final Bounding Box:", boundingBox);
      // In a future step, we would save this to the database.
    } else {
      // Box is too small, likely an accidental click, so clear it.
      setBoundingBox(null);
    }
  };

  // --- Port Marker Placement Handler ---
  const handlePlaceMarker = (e) => {
    // Don't place a marker if we are in the middle of drawing the bounding box.
    if (isDrawing || !boundingBox || !selectedPort) {
      return;
    }

    const imageCoords = getRelativeCoords(e);
    if (!imageCoords) return;

    // Check if the click is inside the bounding box
    const isInside =
      imageCoords.x >= boundingBox.x &&
      imageCoords.x <= boundingBox.x + boundingBox.width &&
      imageCoords.y >= boundingBox.y &&
      imageCoords.y <= boundingBox.y + boundingBox.height;

    if (isInside) {
      // Calculate coordinates *relative to the bounding box* for portability
      const portRelX = (imageCoords.x - boundingBox.x) / boundingBox.width;
      const portRelY = (imageCoords.y - boundingBox.y) / boundingBox.height;

      const newCoords = { x: portRelX, y: portRelY };

      setPortCoordinates(prev => ({
        ...prev,
        [selectedPort.id]: newCoords,
      }));
    }
  };

  const handleSelectPort = (port) => {
    setSelectedPort(port);
  };

  const handleSave = () => {
    // Pass the current state up to the context handler.
    onSave({ boundingBox, portCoordinates });
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
          <div className="w-96 bg-gray-50 p-4 flex flex-col border-r overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">1. Define Area</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click and drag on the image to draw a bounding box around the equipment. This defines the reference area for all port coordinates.
            </p>
            {boundingBox && (
                <div className="text-xs bg-indigo-100 p-2 rounded-md text-indigo-800 space-y-1 mb-4">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Reference Box Drawn</p>
                      <button onClick={() => { setBoundingBox(null); setPortCoordinates({}); }} className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold">Clear</button>
                    </div>
                    <p>X: {boundingBox.x.toFixed(3)}, Y: {boundingBox.y.toFixed(3)}</p>
                    <p>W: {boundingBox.width.toFixed(3)}, H: {boundingBox.height.toFixed(3)}</p>
                </div>
            )}

            <h3 className="text-lg font-semibold mb-2 text-gray-800">2. Select & Map Port</h3>
            <p className="text-sm text-gray-600 mb-4">
              {boundingBox ? 'Select a port, then click its location inside the yellow box on the image.' : 'You must define an area first.'}
            </p>
            <div className="flex-grow border rounded-md bg-white">
              <ul className="overflow-y-auto h-full max-h-96">
                {(equipment.ports && equipment.ports.length > 0) ? (
                  equipment.ports.map(port => (
                    <li
                      key={port.id}
                      onClick={() => handleSelectPort(port)}
                      className={`p-3 cursor-pointer hover:bg-indigo-100 border-b last:border-b-0 transition-colors duration-150 ${
                        selectedPort?.id === port.id ? 'bg-indigo-200 font-semibold text-indigo-800' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{port.label}</span>
                        {portCoordinates[port.id] && (
                          <span className="text-xs font-normal bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Mapped</span>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-gray-500 italic">No ports defined for this equipment.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Image Viewer */}
          <div
            ref={imageContainerRef}
            className="flex-grow p-4 overflow-auto flex items-center justify-center bg-gray-200 relative"
            onMouseDown={handleBoxDrawStart}
            onMouseMove={handleBoxDrawMove}
            onMouseUp={handleBoxDrawEnd}
            onMouseLeave={handleBoxDrawEnd} // Stop drawing if mouse leaves container
            onClick={handlePlaceMarker}
            style={{ cursor: isDrawing ? 'crosshair' : (boundingBox && selectedPort ? 'copy' : 'default') }}
          >
            {imageUrl ? (
              <div className="relative select-none" style={{ lineHeight: 0 }}>
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={`Panel for ${equipment.name}`}
                  className="max-w-full max-h-full object-contain"
                  draggable="false"
                />
                {/* Render the Bounding Box */}
                {boundingBox && (
                  <div
                    className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400 bg-opacity-20 pointer-events-none"
                    style={{
                      left: `${boundingBox.x * 100}%`,
                      top: `${boundingBox.y * 100}%`,
                      width: `${boundingBox.width * 100}%`,
                      height: `${boundingBox.height * 100}%`,
                    }}
                  />
                )}
                {/* Render Port Markers */}
                {boundingBox && Object.entries(portCoordinates).map(([portId, coords]) => {
                  const port = equipment.ports.find(p => p.id === parseInt(portId));
                  if (!port) return null;

                  const isSelected = selectedPort?.id === parseInt(portId);

                  return (
                    <div
                      key={portId}
                      className={`absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ${isSelected ? 'bg-blue-500 border-blue-300 scale-125' : 'bg-green-500 border-green-300'}`}
                      style={{
                        left: `${(boundingBox.x + coords.x * boundingBox.width) * 100}%`,
                        top: `${(boundingBox.y + coords.y * boundingBox.height) * 100}%`,
                        boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                      }}
                      title={port.label}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No image available for this equipment.</p>
            )}
          </div>
        </div>

        {/* Footer (for future actions) */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600" disabled={isSaving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !boundingBox}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortMappingModal;