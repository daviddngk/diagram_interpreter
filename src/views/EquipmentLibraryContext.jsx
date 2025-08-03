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
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      setDetailsError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/library/equipment/${selectedId}`);
        setSelectedEquipment(response.data);
      } catch (error) {
        console.error(`Error fetching details for equipment ${selectedId}:`, error);
        setDetailsError("Failed to load equipment details.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedId]);

  // The value object contains everything we want to expose to consuming components
  const value = {
    equipmentList, isLoadingList, listError,
    selectedId, setSelectedId, // Expose the setter for the view to use
    selectedEquipment, isLoadingDetails, detailsError,
    refreshList: fetchEquipmentList, // Expose a function to manually refresh
  };

  return (
    <EquipmentLibraryContext.Provider value={value}>
      {children}
    </EquipmentLibraryContext.Provider>
  );
};

