import { useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface AdminPOI {
  id: string;
  name: string;
  location: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  floors?: number;
  tags?: Record<string, string>;
  [key: string]: any;
}

interface UseMapAdminReturn {
  // Admin State
  isAdmin: boolean;
  userRole: string | null;
  adminLocations: string[];
  availableLocations: string[];
  selectedLocation: string;
  
  // Modal States
  showAddPOIModal: boolean;
  showEditPOIModal: boolean;
  showAdminActions: boolean;
  
  // Form States
  addPOICoords: { lat: number; lon: number } | null;
  buildingName: string;
  numberOfFloors: string;
  editingPOI: AdminPOI | null;
  newName: string;
  newFloors: string;
  adminActionPOI: AdminPOI | null;
  
  // Functions
  openAddBuildingModal: (lat: number, lon: number) => void;
  openEditBuildingModal: (poi: AdminPOI) => void;
  confirmDeleteBuilding: (poi: AdminPOI, onConfirm: () => void) => void;
  submitNewBuilding: () => Promise<void>;
  submitEditBuilding: () => Promise<void>;
  deleteBuilding: (poi: AdminPOI) => Promise<void>;
  enableAdminPOICreation: (webViewRef: React.RefObject<any>, setTempMessage: (msg: string) => void) => void;
  handleAdminWebViewMessage: (parsed: any, pois: any[], webViewRef: React.RefObject<any>) => boolean;
  validateAdminPermission: (poi: AdminPOI) => boolean;
  
  // Setters
  setShowAddPOIModal: (show: boolean) => void;
  setShowEditPOIModal: (show: boolean) => void;
  setShowAdminActions: (show: boolean) => void;
  setBuildingName: (name: string) => void;
  setNumberOfFloors: (floors: string) => void;
  setNewName: (name: string) => void;
  setNewFloors: (floors: string) => void;
  setSelectedLocation: (location: string) => void;
  setAdminActionPOI: (poi: AdminPOI | null) => void;
  
  // WebView Integration
  injectAdminHandlers: (webViewRef: React.RefObject<any>, isMapReady: boolean) => void;
}

export const useMapAdmin = (
  refreshPOIs: () => Promise<void>,
  setStatus: (status: string) => void,
  setError: (error: string | null) => void,
  showErrorPopup: (message: string) => void,
  showSuccessPopup: (message: string) => void,
  showConfirmationPopup: (data: { title: string; message: string; onConfirm: () => void }) => void,
): UseMapAdminReturn => {
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  // Modal States
  const [showAddPOIModal, setShowAddPOIModal] = useState(false);
  const [showEditPOIModal, setShowEditPOIModal] = useState(false);
  const [showAdminActions, setShowAdminActions] = useState(false);
  
  // Form States
  const [addPOICoords, setAddPOICoords] = useState<{ lat: number; lon: number } | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');
  const [editingPOI, setEditingPOI] = useState<AdminPOI | null>(null);
  const [newName, setNewName] = useState('');
  const [newFloors, setNewFloors] = useState('');
  const [adminActionPOI, setAdminActionPOI] = useState<AdminPOI | null>(null);

  // Check if user is admin
  useEffect(() => {
    const fetchRole = async () => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;
      
      try {
        const userDoc = await firestore().collection('userInformation').doc(userId).get();
        const role = userDoc.data()?.role;
        setUserRole(role);
        setIsAdmin(role === 'admin');
        
        if (role === 'editor') {
          // Fetch editor-specific locations
          const editorLocations = userDoc.data()?.adminLocations || [];
          setAdminLocations(editorLocations);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setError('Failed to check admin permissions');
      }
    };
    fetchRole();
  }, [setError]);

  // Fetch available locations for admin
  useEffect(() => {
    const fetchLocations = async () => {
      if (!isAdmin) return;
      
      try {
        const snapshot = await firestore().collection('locations').get();
        setAvailableLocations(snapshot.docs.map((doc) => doc.id));
      } catch (error) {
        console.error('Error fetching locations:', error);
        setError('Failed to fetch locations');
      }
    };
    fetchLocations();
  }, [isAdmin, setError]);

  // Open modal to add new POI
  const openAddBuildingModal = useCallback((lat: number, lon: number) => {
    setAddPOICoords({ lat, lon });
    setShowAddPOIModal(true);
  }, []);

  // Open modal to edit existing POI
  const openEditBuildingModal = useCallback((poi: AdminPOI) => {
    setEditingPOI(poi);
    setNewName(poi.name || '');
    setNewFloors(poi.floors?.toString() || '');
    setShowEditPOIModal(true);
  }, []);

  // Confirm delete building with popup
  const confirmDeleteBuilding = useCallback((poi: AdminPOI, onConfirmCallback: () => void) => {
    showConfirmationPopup({
      title: 'Delete Building',
      message: `Are you sure you want to delete "${poi.name}"?`,
      onConfirm: async () => {
        try {
          await deleteBuilding(poi);
          onConfirmCallback();
        } catch (error) {
          console.error('Error in delete confirmation:', error);
        }
      },
    });
  }, [showConfirmationPopup]);

  // Submit new building
  const submitNewBuilding = useCallback(async () => {
    if (!addPOICoords) return;
    
    if (!buildingName.trim()) {
      showErrorPopup('Building name required');
      return;
    }
    
    if (!numberOfFloors.trim() || isNaN(Number(numberOfFloors))) {
      showErrorPopup('Please enter a valid number of floors');
      return;
    }
    
    if (!selectedLocation) {
      showErrorPopup('Please select a location');
      return;
    }
    
    try {
      const newDoc = {
        name: buildingName,
        centroid: {
          latitude: addPOICoords.lat,
          longitude: addPOICoords.lon,
        },
        floors: Number(numberOfFloors),
        tags: {
          building: 'yes',
        },
      };
      
      await firestore().collection(`locations/${selectedLocation}/buildingPOIs`).add(newDoc);
      
      setShowAddPOIModal(false);
      setBuildingName('');
      setNumberOfFloors('');
      setAddPOICoords(null);
      setStatus('Building added!');
      
      await refreshPOIs();
    } catch (error) {
      console.error('Error adding building:', error);
      setError('Failed to add building');
    }
  }, [addPOICoords, buildingName, numberOfFloors, selectedLocation, showErrorPopup, setStatus, setError, refreshPOIs]);

  // Submit edit building
  const submitEditBuilding = useCallback(async () => {
    if (!newName.trim()) {
      showErrorPopup('Building name required');
      return;
    }
    
    if (!newFloors.trim() || isNaN(Number(newFloors))) {
      showErrorPopup('Please enter a valid number of floors');
      return;
    }

    if (!editingPOI || !editingPOI.id || !editingPOI.location) {
      console.error('No valid POI ID or location found:', editingPOI);
      setError('Invalid building data');
      return;
    }

    try {
      await firestore()
        .doc(`locations/${editingPOI.location}/buildingPOIs/${editingPOI.id}`)
        .update({
          name: newName,
          floors: Number(newFloors),
        });

      setShowEditPOIModal(false);
      setEditingPOI(null);
      setNewName('');
      setNewFloors('');
      setStatus('Building updated!');

      await refreshPOIs();
      showSuccessPopup('Building information updated successfully.');
    } catch (error) {
      console.error('Error updating building:', error);
      setError('Failed to update building');
    }
  }, [newName, newFloors, editingPOI, showErrorPopup, setError, setStatus, refreshPOIs, showSuccessPopup]);

  // Delete building
  const deleteBuilding = useCallback(async (poi: AdminPOI) => {
    try {
      await firestore().doc(`locations/${poi.location}/buildingPOIs/${poi.id}`).delete();
      
      setStatus(`Building "${poi.name}" deleted`);
      await refreshPOIs();
    } catch (error) {
      console.error('Error deleting building:', error);
      showErrorPopup('Failed to delete building');
    }
  }, [setStatus, refreshPOIs, showErrorPopup]);

  // Inject admin handlers into WebView
  const injectAdminHandlers = useCallback((webViewRef: React.RefObject<any>, isMapReady: boolean) => {
    if (!isMapReady || !webViewRef.current) return;

    // Set admin mode in the WebView
    const setAdminJS = `window.setAdminMode && window.setAdminMode(${userRole === 'admin' || userRole === 'editor' ? 'true' : 'false'});`;
    webViewRef.current.injectJavaScript(setAdminJS);

    // Inject admin handlers
    const injectedJS = `
      window.editPOI = function(poiId) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'EDIT_POI',
          poiId: poiId
        }));
      };
      window.deletePOI = function(poiId) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DELETE_POI',
          poiId: poiId
        }));
      };
    `;
    webViewRef.current.injectJavaScript(injectedJS);
  }, [userRole]);

  // Enable admin POI creation mode
  const enableAdminPOICreation = useCallback((webViewRef: React.RefObject<any>, setTempMessage: (msg: string) => void) => {
    if (!webViewRef.current) return;
    
    webViewRef.current.injectJavaScript(`window.enableAdminPOICreation();`);
    setTempMessage('Click on the map to add a new POI');
  }, []);

  // Validate admin permissions for a POI
  const validateAdminPermission = useCallback((poi: AdminPOI): boolean => {
    return userRole === 'admin' || 
           (userRole === 'editor' && adminLocations.includes(poi.location));
  }, [userRole, adminLocations]);

  // Handle admin-related WebView messages
  const handleAdminWebViewMessage = useCallback((parsed: any, pois: any[], webViewRef: React.RefObject<any>): boolean => {
    switch (parsed.type) {
      case 'ADMIN_ADD_POI':
        openAddBuildingModal(parsed.lat, parsed.lon);
        return true;

      case 'EDIT_POI':
        const poiToEdit = pois.find((p) => p.id === parsed.poiId);
        if (poiToEdit) {
          openEditBuildingModal(poiToEdit);
        }
        return true;

      case 'DELETE_POI':
        const poiToDelete = pois.find((p) => p.id === parsed.poiId);
        if (poiToDelete) {
          confirmDeleteBuilding(poiToDelete, () => {
            webViewRef.current?.injectJavaScript('map.closePopup();');
          });
        }
        return true;

      case 'ADMIN_POI_SELECTED': {
        const adminPOI = pois.find((p) => p.id === parsed.poi.id);
        if (!adminPOI) return true;
        
        console.log('userRole:', userRole);
        console.log('adminLocations:', adminLocations);
        console.log('adminPOI.location:', adminPOI.location);

        const canEdit = validateAdminPermission(adminPOI);

        if (canEdit) {
          setAdminActionPOI(adminPOI);
          setShowAdminActions(true);
        } else {
          showErrorPopup('You do not have permission to modify this POI.');
        }

        webViewRef.current?.injectJavaScript('map.closePopup();');
        return true;
      }

      default:
        return false; // Message not handled by admin
    }
  }, [openAddBuildingModal, openEditBuildingModal, confirmDeleteBuilding, userRole, adminLocations, validateAdminPermission, setAdminActionPOI, setShowAdminActions, showErrorPopup]);

  return {
    // Admin State
    isAdmin,
    userRole,
    adminLocations,
    availableLocations,
    selectedLocation,
    
    // Modal States
    showAddPOIModal,
    showEditPOIModal,
    showAdminActions,
    
    // Form States
    addPOICoords,
    buildingName,
    numberOfFloors,
    editingPOI,
    newName,
    newFloors,
    adminActionPOI,
    
    // Functions
    openAddBuildingModal,
    openEditBuildingModal,
    confirmDeleteBuilding,
    submitNewBuilding,
    submitEditBuilding,
    deleteBuilding,
    enableAdminPOICreation,
    handleAdminWebViewMessage,
    validateAdminPermission,
    
    // Setters
    setShowAddPOIModal,
    setShowEditPOIModal,
    setShowAdminActions,
    setBuildingName,
    setNumberOfFloors,
    setNewName,
    setNewFloors,
    setSelectedLocation,
    setAdminActionPOI,
    
    // WebView Integration
    injectAdminHandlers,
  };
};
