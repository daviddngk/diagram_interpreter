import React, { useMemo, useState, useRef, useEffect } from 'react';

const BoundingBoxModal = ({ isOpen, onClose, imageUrl, onCaptureData, consolidatedData, equipmentLibrary = [] }) => {
  const [drawingNodeId, setDrawingNodeId] = useState(null);
  const [boxes, setBoxes] = useState({}); // Stores drawn boxes: { [nodeId]: { x, y, width, height } } in ABSOLUTE PIXELS
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState(null); // Store natural dimensions of the image
  const [calculatedPorts, setCalculatedPorts] = useState({}); // Stores located ports: { [nodeId]: [port1, port2, ...] }
  const [hoverInfo, setHoverInfo] = useState({
    coords: null,
    hoveredNode: null,
    hoveredPort: null,
  });

  // Effect to initialize state when the modal is opened
  useEffect(() => {
    if (isOpen) {
      // Reset drawing state
      setDrawingNodeId(null);
      setIsDrawing(false);
      setStartPoint(null);
      setImageDimensions(null); // Reset image dimensions on open
      setHoverInfo({ coords: null, hoveredNode: null, hoveredPort: null });

      // Pre-populate with existing bbox and port data from consolidatedData
      let potentialNodes = consolidatedData?.nodes?.nodes || consolidatedData?.nodes?.equipment_nodes || consolidatedData?.nodes;
      const nodes = Array.isArray(potentialNodes) ? potentialNodes : [];
      const initialBoxes = {};
      const initialPorts = {};
      nodes.forEach(node => {
        // Assuming bbox is already in absolute pixel coordinates if it exists
        if (node.bbox) initialBoxes[node.id] = node.bbox;
        if (node.ports) initialPorts[node.id] = node.ports;
      });
      setBoxes(initialBoxes);
      setCalculatedPorts(initialPorts);
    }
  }, [isOpen, consolidatedData]);
  // Accommodate different possible shapes for the nodes data from the LLM.
  // It can return a raw array, or an object with a "nodes" or "equipment_nodes" key.
  let potentialNodesSource = consolidatedData?.nodes;
  if (potentialNodesSource && !Array.isArray(potentialNodesSource)) {
    potentialNodesSource = potentialNodesSource.nodes || potentialNodesSource.equipment_nodes;
  }

  const nodes = Array.isArray(potentialNodesSource) ? potentialNodesSource : [];

  // Use useMemo to avoid re-calculating the matches on every render.
  const matchedNodes = useMemo(() => {
    return nodes.map(node => {
      const contextMatch = node.matchedEquipment || node.matched_equipment || null;

      let resolvedMatch = contextMatch || null;
      if (resolvedMatch && Array.isArray(equipmentLibrary) && equipmentLibrary.length > 0) {
        const matchId = resolvedMatch.id ?? resolvedMatch.equipment_id ?? null;
        let libraryMatch = null;

        if (matchId !== null && matchId !== undefined) {
          libraryMatch = equipmentLibrary.find(item => item.id === matchId);
        }

        if (!libraryMatch && resolvedMatch?.name) {
          const lowerName = resolvedMatch.name.toLowerCase();
          libraryMatch = equipmentLibrary.find(
            item => typeof item.name === 'string' && item.name.toLowerCase() === lowerName
          );
        }

        if (libraryMatch) {
          resolvedMatch = libraryMatch;
        }
      }

      return {
        ...node,
        matchedEquipment: resolvedMatch,
      };
    });
  }, [nodes, equipmentLibrary]);

  // Combine matched nodes with their bounding boxes for a unified view
  const nodesWithBBoxes = useMemo(() => {
    return matchedNodes.map(node => ({
      ...node,
      bbox: boxes[node.id] || null,
    }));
  }, [matchedNodes, boxes]);

  // Combine nodes with their calculated ports for the final display data
  const nodesForDisplay = useMemo(() => {
    return nodesWithBBoxes.map(node => ({
      ...node,
      ports: calculatedPorts[node.id] || [], // Use calculated ports for this node
    }));
  }, [nodesWithBBoxes, calculatedPorts]);

  const handleDrawClick = (nodeId) => {
    // If clicking "Save BB", just exit drawing mode. The box is already in state.
    // If clicking "Draw BB", enter drawing mode for that node.
    setDrawingNodeId(prevId => (prevId === nodeId ? null : nodeId));
  };

  const handleCapture = () => {
    if (onCaptureData) {
      // Capture the enriched node data, which now includes bounding boxes and port locations.
      // This will overwrite any previous 'nodes' data in the consolidated context.
      onCaptureData('nodes', nodesForDisplay);
      onClose(); // Close the modal after capturing.
    }
  };

  const handleAddPorts = (nodeId) => {
    const node = nodesWithBBoxes.find(n => n.id === nodeId);
    if (!node || !node.bbox || !node.matchedEquipment) {
      alert('Cannot add ports: Node must have a bounding box and a matched equipment type.');
      return;
    }
    if (!node.matchedEquipment.ports || node.matchedEquipment.ports.length === 0) {
      alert('Cannot add ports: The matched equipment in the library has no ports defined.');
      return;
    }

    const newPorts = node.matchedEquipment.ports.map(p => {
      if (p.coordinate_x == null || p.coordinate_y == null) {
        return null; // Skip ports without relative coordinates in the library
      }
      // Calculate the absolute pixel coordinates on the diagram
      const absolute_x = node.bbox.x + (p.coordinate_x * node.bbox.width);
      const absolute_y = node.bbox.y + (p.coordinate_y * node.bbox.height);

      return {
        id: p.id, label: p.label, type: p.type, direction: p.direction, rate: p.rate,
        location: {
          absolute: { x: absolute_x, y: absolute_y },
          relative: { x: p.coordinate_x, y: p.coordinate_y }
        }
      };
    }).filter(Boolean); // remove nulls

    setCalculatedPorts(prev => ({ ...prev, [nodeId]: newPorts }));
  };

  const handleImageLoad = (e) => {
    setImageDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight,
    });
  };

  const getAbsoluteCoords = (e) => {
    if (!imageRef.current || !imageDimensions) return null;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;

    // Clamp coordinates to be within the image bounds
    const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const mouseY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = mouseX * scaleX;
    const y = mouseY * scaleY;

    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || !drawingNodeId || !imageDimensions) return; // Only left-click, in drawing mode, and when image is loaded
    e.preventDefault();
    const coords = getAbsoluteCoords(e);
    if (coords) {
      setStartPoint(coords);
      setIsDrawing(true);
      // Initialize the box with the starting point
      setBoxes(prev => ({ ...prev, [drawingNodeId]: { x: coords.x, y: coords.y, width: 0, height: 0 } }));
    }
  };

  const handleMouseMove = (e) => {
    const coords = getAbsoluteCoords(e);
    if (!coords) {
      // Clear hover info if mouse is outside the image area
      setHoverInfo({ coords: null, hoveredNode: null, hoveredPort: null });
      return;
    }

    // --- Drawing Logic (if active) ---
    if (isDrawing && startPoint && drawingNodeId) {
      e.preventDefault();
      const newBox = {
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(startPoint.x - coords.x),
        height: Math.abs(startPoint.y - coords.y),
      };
      setBoxes(prev => ({ ...prev, [drawingNodeId]: newBox }));
    }

    // --- Hover Logic ---
    let newHoveredNode = null;
    let newHoveredPort = null;
    const portHitRadius = 5; // 5-pixel radius

    // Node hit-detection
    for (const node of nodesForDisplay) {
      if (node.bbox &&
          coords.x >= node.bbox.x && coords.x <= node.bbox.x + node.bbox.width &&
          coords.y >= node.bbox.y && coords.y <= node.bbox.y + node.bbox.height) {
        newHoveredNode = node;
        break;
      }
    }

    // Port hit-detection
    for (const node of nodesForDisplay) {
      if (node.ports) {
        for (const port of node.ports) {
          const portX = port.location.absolute.x;
          const portY = port.location.absolute.y;
          const distance = Math.sqrt(Math.pow(coords.x - portX, 2) + Math.pow(coords.y - portY, 2));

          if (distance <= portHitRadius) {
            newHoveredPort = { ...port, parentNodeLabel: node.label };
            break;
          }
        }
      }
      if (newHoveredPort) break;
    }

    setHoverInfo({
      coords: { x: Math.round(coords.x), y: Math.round(coords.y) },
      hoveredNode: newHoveredNode,
      hoveredPort: newHoveredPort,
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleMouseLeave = (e) => {
    // If drawing, finalize the box
    if (isDrawing) {
      handleMouseUp(e);
    }
    // Clear hover info
    setHoverInfo({ coords: null, hoveredNode: null, hoveredPort: null });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-screen-2xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Bounding Box (Manual)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-grow flex overflow-hidden">
          {/* Left Panel: Image Viewer */}
          <div
            ref={imageContainerRef}
            className="w-2/3 bg-gray-200 flex items-center justify-center p-4 overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave} // Stop drawing and clear hover info
            style={{ cursor: drawingNodeId ? 'crosshair' : 'default' }}
          >
            {imageUrl ? (
              <div className="relative select-none" style={{ lineHeight: 0 }}>
                <img
                  ref={imageRef}
                  onLoad={handleImageLoad}
                  src={imageUrl}
                  alt="Diagram for bounding box drawing"
                  className="max-h-full max-w-full object-contain"
                  draggable="false"
                />
                {/* Render all drawn boxes */}
                {imageDimensions && Object.entries(boxes).map(([nodeId, box]) => {
                  if (!box) return null;
                  const isBeingDrawn = drawingNodeId === parseInt(nodeId);
                  return (
                    <div
                      key={nodeId}
                      className={`absolute border-2 ${isBeingDrawn ? 'border-yellow-400 bg-yellow-400/20' : 'border-green-500 bg-green-500/20'} pointer-events-none`}
                      style={{
                        left: `${(box.x / imageDimensions.width) * 100}%`,
                        top: `${(box.y / imageDimensions.height) * 100}%`,
                        width: `${(box.width / imageDimensions.width) * 100}%`,
                        height: `${(box.height / imageDimensions.height) * 100}%`,
                      }}
                    />
                  );
                })}
                {/* Render all calculated ports */}
                {imageDimensions && nodesForDisplay.map(node => (
                  node.ports?.map(port => (
                    <div
                      key={`${node.id}-${port.id}`}
                      className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${(port.location.absolute.x / imageDimensions.width) * 100}%`,
                        top: `${(port.location.absolute.y / imageDimensions.height) * 100}%`,
                        boxShadow: '0 0 6px rgba(0,0,0,0.7)',
                      }}
                      title={`${node.label} - Port: ${port.label}`}
                    />
                  ))
                ))}
                {/* Status Bar */}
                {imageDimensions && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 flex justify-between items-center font-mono z-10">
                    {/* Left: Coords */}
                    <div className="w-1/3">
                      {hoverInfo.coords ? `X: ${hoverInfo.coords.x}, Y: ${hoverInfo.coords.y}` : 'X: -, Y: -'}
                    </div>
                    {/* Center: Node Info */}
                    <div className="w-1/3 text-center truncate px-2" title={hoverInfo.hoveredNode ? `Node: ${hoverInfo.hoveredNode.label} (ID: ${hoverInfo.hoveredNode.id})` : ''}>
                      {hoverInfo.hoveredNode ? `Node: ${hoverInfo.hoveredNode.label}` : 'Node: -'}
                    </div>
                    {/* Right: Port Info */}
                    <div className="w-1/3 text-right truncate px-2" title={hoverInfo.hoveredPort ? `Port: ${hoverInfo.hoveredPort.label} (ID: ${hoverInfo.hoveredPort.id}) on ${hoverInfo.hoveredPort.parentNodeLabel}` : ''}>
                      {hoverInfo.hoveredPort ? `Port: ${hoverInfo.hoveredPort.label}` : 'Port: -'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No image available.</p>
            )}
          </div>

          {/* Right Panel: BBox List and JSON */}
          <div className="w-1/3 flex flex-col border-l">
            {/* BBox List */}
            <div className="h-1/2 p-4 border-b">
              <h3 className="font-semibold mb-2">Detected Nodes</h3>
              <div className="h-full border bg-gray-50 rounded-md overflow-y-auto">
                {nodesForDisplay.length > 0 ? (
                  <ul>
                    {nodesForDisplay.map(node => (
                      <li key={node.id} className={`p-2 border-b last:border-b-0 text-sm flex justify-between items-center transition-colors ${drawingNodeId === node.id ? 'bg-yellow-100' : 'hover:bg-gray-100'}`} >
                        <div>
                          <p className="font-medium text-gray-800">{node.label}</p>
                          {node.matchedEquipment ? (
                            <p className="text-xs text-green-700 pl-2">
                              ↳ Matched: <span className="font-semibold">{node.matchedEquipment.name}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 pl-2 italic">
                              ↳ No match in library
                            </p>
                          )}
                          {node.bbox && (
                            <p className="text-xs text-blue-600 pl-2">
                              ↳ Box: [{Math.round(node.bbox.x)}, {Math.round(node.bbox.y)}] W: {Math.round(node.bbox.width)}, H: {Math.round(node.bbox.height)}
                            </p>
                          )}
                          {node.ports && node.ports.length > 0 && (
                            <p className="text-xs text-purple-600 pl-2">
                              ↳ {node.ports.length} ports located.
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-1 flex-shrink-0 ml-2">
                          <button
                            onClick={() => handleDrawClick(node.id)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${drawingNodeId === node.id ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                          >
                            {drawingNodeId === node.id ? 'Save BB' : 'Draw BB'}
                          </button>
                          <button
                            onClick={() => handleAddPorts(node.id)}
                            disabled={!node.bbox || !node.matchedEquipment}
                            className="px-2 py-1 text-xs bg-teal-500 hover:bg-teal-600 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title={!node.bbox || !node.matchedEquipment ? 'Draw a bounding box and ensure a match to enable' : 'Locate ports based on library data'}>
                            Add Ports
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm text-center p-4">No nodes detected. Run the "Node Detection (LLM)" tool first.</p>
                  </div>
                )}
              </div>
            </div>
            {/* JSON Viewer */}
            <div className="h-1/2 p-4 flex flex-col overflow-hidden">
              <h3 className="font-semibold mb-2">Captured Data (JSON)</h3>
              <div className="flex-grow border-2 border-dashed border-gray-400 p-2 overflow-y-auto bg-gray-50">
                <pre className="text-xs">
                  {nodesForDisplay.length > 0 ? JSON.stringify({ nodes: nodesForDisplay }, null, 2) : 'JSON output will appear here.'}
                </pre>
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
            onClick={handleCapture}
            disabled={!nodesForDisplay.some(n => n.bbox)}
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
