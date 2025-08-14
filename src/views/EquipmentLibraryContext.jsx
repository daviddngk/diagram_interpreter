import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';

const API_BASE_URL = "http://localhost:5000";

// 1. Create the context
const EquipmentLibraryContext = createContext();

// 2. Create a custom hook for easy consumption in components
export const useEquipmentLibrary = () => {
  const context = useContext(EquipmentLibraryContext);
  if (!context) {
    throw new Error('useEquipmentLibrary must be used within an EquipmentLibraryProvider');
  }
  return context;
};

// 3. Create the Provider component that will hold all the state and logic
export const EquipmentLibraryProvider = ({ children }) => {
  // All state from the view is moved here
  const [equipmentList, setEquipmentList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // --- NEW: State for CRUD operations ---
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'new'
  const [formState, setFormState] = useState(null); // Holds data for the edit/new form

  // --- NEW: State for Port Modal ---
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState(null); // null for new, or port object for edit

  // ------------------------------------

  // All data fetching logic is also moved here
  const fetchEquipmentList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/library/equipment`);
      setEquipmentList(response.data.equipment || []);
    } catch (error) {
      console.error("Error fetching equipment list:", error);
      setListError("Failed to load equipment list. Is the backend server running?");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Fetch the list only once when the provider mounts for the first time
  useEffect(() => {
    fetchEquipmentList();
  }, [fetchEquipmentList]);

  // Fetch details only when the selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedEquipment(null);
      setFormState(null);
      setMode('view');
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      setDetailsError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/library/equipment/${selectedId}`);
        setSelectedEquipment(response.data);
        setFormState(response.data); // Load selected data into the form state
        setMode('view'); // Reset to view mode when selection changes
      } catch (error) {
        console.error(`Error fetching details for equipment ${selectedId}:`, error);
        setDetailsError("Failed to load equipment details.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedId]);

  // --- NEW: Handlers for CRUD actions ---
  const handleNew = () => {
    setSelectedId(null);
    setSelectedEquipment(null);
    setFormState({ name: '', description: '', front_panel_image: '', port_map_image: '', ports: [] });
    setMode('new');
  };

  const handleEdit = () => {
    if (selectedEquipment) {
      setFormState(selectedEquipment); // Ensure form has the latest data
      setMode('edit');
    }
  };

  const handleCancel = () => {
    setFormState(selectedEquipment); // Revert form to original selected data
    setMode('view');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSave = async () => {
    if (!formState || !formState.name) {
      alert("Equipment name is required.");
      return;
    }

    try {
      if (mode === 'new') {
        // Create new item
        const response = await axios.post(`${API_BASE_URL}/library/equipment`, formState);
        await fetchEquipmentList(); // Refresh the list
        setSelectedId(response.data.id); // Select the newly created item
      } else if (mode === 'edit') {
        // Update existing item
        await axios.put(`${API_BASE_URL}/library/equipment/${selectedId}`, formState);
        await fetchEquipmentList(); // Refresh the list
        // Re-fetch details to ensure UI consistency
        const response = await axios.get(`${API_BASE_URL}/library/equipment/${selectedId}`);
        setSelectedEquipment(response.data);
        setFormState(response.data);
      }
      setMode('view');
    } catch (error) {
      console.error("Error saving equipment:", error);
      alert(`Failed to save: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm(`Are you sure you want to delete "${selectedEquipment.name}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/library/equipment/${selectedId}`);
      await fetchEquipmentList(); // Refresh list
      setSelectedId(null); // Deselect the deleted item
      setMode('view');
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert(`Failed to delete: ${error.response?.data?.error || error.message}`);
    }
  };

  // --- NEW: Handlers for Port CRUD actions ---
  const handleOpenPortModal = (port = null) => {
    setEditingPort(port);
    setIsPortModalOpen(true);
  };

  const handleClosePortModal = () => {
    setIsPortModalOpen(false);
    setEditingPort(null);
  };

  const handleSavePort = async (portData) => {
    try {
      if (portData.id) {
        // Update existing port
        await axios.put(`${API_BASE_URL}/library/ports/${portData.id}`, portData);
      } else {
        // Create new port for the currently selected equipment
        await axios.post(`${API_BASE_URL}/library/equipment/${selectedId}/ports`, portData);
      }
      // Refresh the details to show the updated port list
      const response = await axios.get(`${API_BASE_URL}/library/equipment/${selectedId}`);
      setFormState(response.data);
      setSelectedEquipment(response.data);
      handleClosePortModal();
    } catch (error) {
      console.error("Error saving port:", error);
      alert(`Failed to save port: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeletePort = async (portId) => {
    if (!window.confirm("Are you sure you want to delete this port?")) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/library/ports/${portId}`);
      // Refresh the details to show the updated port list
      const response = await axios.get(`${API_BASE_URL}/library/equipment/${selectedId}`);
      setFormState(response.data);
      setSelectedEquipment(response.data);
    } catch (error) {
      console.error("Error deleting port:", error);
      alert(`Failed to delete port: ${error.response?.data?.error || error.message}`);
    }
  };

  // The value object contains everything we want to expose to consuming components
  const value = {
    equipmentList, isLoadingList, listError,
    selectedId, setSelectedId, // Expose the setter for the view to use
    selectedEquipment, isLoadingDetails, detailsError,
    refreshList: fetchEquipmentList, // Expose a function to manually refresh
    mode, formState, handleNew, handleEdit, handleCancel, handleSave, handleDelete, handleFormChange,
    isPortModalOpen, editingPort, handleOpenPortModal, handleClosePortModal, handleSavePort, handleDeletePort
  };

  return (
    <EquipmentLibraryContext.Provider value={value}>
      {children}
    </EquipmentLibraryContext.Provider>
  );
};
