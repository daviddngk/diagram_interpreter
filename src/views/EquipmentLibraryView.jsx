import React from 'react';
// Import the custom hook to use our new context
import { useEquipmentLibrary } from './EquipmentLibraryContext';


const EquipmentLibraryView = () => {
  // Consume the context to get all state and functions.
  // All the complex useState and useEffect hooks are gone from the view!
  const {
    equipmentList,
    isLoadingList,
    listError,
    selectedId,
    setSelectedId,
    selectedEquipment,
    isLoadingDetails,
    detailsError,
  } = useEquipmentLibrary();

  // The JSX remains identical, but it's now powered by the context state.
  return (
    <div className="flex h-full bg-gray-100">
      {/* Left Pane: Equipment List */}
      <div className="w-1/3 border-r border-gray-300 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-300 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Equipment</h2>
        </div>
        {isLoadingList && <p className="p-4 text-gray-500">Loading...</p>}
        {listError && <p className="p-4 text-red-500">{listError}</p>}
        {!isLoadingList && !listError && (
          <ul>
            {equipmentList.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 border-b border-gray-200 hover:bg-indigo-50 focus:outline-none transition-colors duration-150 ${
                    selectedId === item.id ? 'bg-indigo-100' : ''
                  }`}
                >
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">ID: {item.id}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right Pane: Details Form */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-3">Equipment Details</h2>
          {isLoadingDetails && <p className="text-gray-500">Loading details...</p>}
          {detailsError && <p className="text-red-500">{detailsError}</p>}
          
          {!selectedId && !isLoadingDetails && (
            <p className="text-gray-500 italic">Select an item from the list to view its details.</p>
          )}

          {selectedEquipment && !isLoadingDetails && (
            <form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" value={selectedEquipment.name || ''} readOnly className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <input type="text" value={selectedEquipment.id || ''} readOnly className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={selectedEquipment.description || ''} readOnly rows="3" className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"></textarea>
                </div>
                {/* Image placeholders */}
                <div><label className="block text-sm font-medium text-gray-700">Front Panel Image: <span className="text-gray-500 font-normal">{selectedEquipment.front_panel_image || 'N/A'}</span></label></div>
                <div><label className="block text-sm font-medium text-gray-700">Port Map Image: <span className="text-gray-500 font-normal">{selectedEquipment.port_map_image || 'N/A'}</span></label></div>
              </div>

              <h3 className="text-xl font-semibold mt-8 mb-4 border-t pt-4">Ports</h3>
              <div className="space-y-4">
                {selectedEquipment.ports && selectedEquipment.ports.length > 0 ? (
                  selectedEquipment.ports.map(port => (
                    <div key={port.id} className="p-3 border rounded-md bg-gray-50 text-sm">
                      <p className="font-bold">{port.label}</p>
                      <p>Type: {port.type}, Direction: {port.direction}, Rate: {port.rate}</p>
                    </div>
                  ))
                ) : (<p className="text-gray-500 italic">No ports associated with this equipment.</p>)}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentLibraryView;