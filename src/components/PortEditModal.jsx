import React, { useState, useEffect } from 'react';

const PortEditModal = ({ port, onSave, onCancel }) => {
  const [formState, setFormState] = useState({
    label: '',
    type: '',
    direction: '',
    rate: ''
  });

  useEffect(() => {
    // If a port is passed, we are in 'edit' mode. Otherwise, 'new' mode.
    if (port) {
      setFormState({
        label: port.label || '',
        type: port.type || '',
        direction: port.direction || '',
        rate: port.rate || ''
      });
    } else {
      // Reset for 'new' mode
      setFormState({ label: '', type: '', direction: '', rate: '' });
    }
  }, [port]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...port, ...formState }); // Pass back the merged data
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">{port ? 'Edit Port' : 'Add New Port'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Label</label>
                <input type="text" name="label" value={formState.label} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <input type="text" name="type" value={formState.type} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Direction</label>
                <input type="text" name="direction" value={formState.direction} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate</label>
                <input type="text" name="rate" value={formState.rate} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Port
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortEditModal;

