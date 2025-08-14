import React from 'react';
// Import the custom hook to use our new context
import { useEquipmentLibrary } from './EquipmentLibraryContext';
import PortEditModal from '../components/PortEditModal';


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
    mode,
    formState,
    handleNew,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
    handleFormChange,
    isPortModalOpen,
    editingPort,
    handleOpenPortModal,
    handleClosePortModal,
    handleSavePort,
    handleDeletePort,
  } = useEquipmentLibrary();

  // The JSX remains identical, but it's now powered by the context state.
  return (
    <>
      <div className="flex h-full bg-gray-100">
        {/* Left Pane: Equipment List */}
      <div className="w-1/3 border-r border-gray-300 bg-white overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-300 sticky top-0 bg-white z-10 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Equipment</h2>
          <button onClick={handleNew} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">New</button>
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
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-2xl font-semibold">
              {mode === 'new' ? 'New Equipment' : 'Equipment Details'}
            </h2>
            <div className="flex space-x-2">
              {mode === 'view' && selectedId && (
                <>
                  <button onClick={handleEdit} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Edit</button>
                  <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                </>
              )}
              {(mode === 'edit' || mode === 'new') && (
                <>
                  <button onClick={handleCancel} className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">Cancel</button>
                  <button onClick={handleSave} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
                </>
              )}
            </div>
          </div>

          {isLoadingDetails && <p className="text-gray-500">Loading details...</p>}
          {detailsError && <p className="text-red-500">{detailsError}</p>}
          
          {mode === 'view' && !selectedId && !isLoadingDetails && (
            <p className="text-gray-500 italic">Select an item from the list to view its details.</p>
          )}

          {formState && (mode === 'edit' || mode === 'new' || (mode === 'view' && selectedEquipment)) && (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" name="name" value={formState.name || ''} onChange={handleFormChange} readOnly={mode === 'view'} className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${mode === 'view' ? 'bg-gray-100' : 'bg-white'}`}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <input
                    type="text"
                    name="id" value={formState.id || ''}
                    readOnly
                    className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"
                    placeholder={mode === 'new' ? '(auto-assigned)' : ''} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea name="description" value={formState.description || ''} onChange={handleFormChange} readOnly={mode === 'view'} rows="3" className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${mode === 'view' ? 'bg-gray-100' : 'bg-white'}`}></textarea>
                </div>
                <div>
                  {formState.front_panel_image && (
                    <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                      <img src={formState.front_panel_image} alt="Front Panel Preview" className="max-w-full h-auto rounded shadow-sm mx-auto" />
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700">Front Panel Image URL</label>
                  <input type="text" name="front_panel_image" value={formState.front_panel_image || ''} onChange={handleFormChange} readOnly={mode === 'view'} className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${mode === 'view' ? 'bg-gray-100' : 'bg-white'}`}/>
                </div>
                <div>
                  {formState.port_map_image && (
                    <div className="mb-2 p-2 bg-gray-50 border rounded-md">
                      <img src={formState.port_map_image} alt="Port Map Preview" className="max-w-full h-auto rounded shadow-sm mx-auto" />
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700">Port Map Image URL</label>
                  <input type="text" name="port_map_image" value={formState.port_map_image || ''} onChange={handleFormChange} readOnly={mode === 'view'} className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${mode === 'view' ? 'bg-gray-100' : 'bg-white'}`}/>
                </div>
              </div>

              <div className="flex justify-between items-center mt-8 mb-4 border-t pt-4">
                <h3 className="text-xl font-semibold">Ports</h3>
                {mode === 'edit' && (
                  <button type="button" onClick={() => handleOpenPortModal(null)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Add Port
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                {formState.ports && formState.ports.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        {mode === 'edit' && <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formState.ports.map(port => (
                        <tr key={port.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{port.label}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{port.type}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{port.direction}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{port.rate}</td>
                          {mode === 'edit' && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button type="button" onClick={() => handleOpenPortModal(port)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                              <button type="button" onClick={() => handleDeletePort(port.id)} className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic">
                    {mode === 'edit' ? 'No ports defined. Click "Add Port" to begin.' : 'No ports associated with this equipment.'}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      </div>
      {isPortModalOpen && (
        <PortEditModal
          port={editingPort}
          onSave={handleSavePort}
          onCancel={handleClosePortModal}
        />
      )}
    </>
  );
};

export default EquipmentLibraryView;