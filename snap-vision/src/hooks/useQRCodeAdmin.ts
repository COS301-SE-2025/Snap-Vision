import { useState, useEffect, useRef, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import QRCode from 'react-native-qrcode-svg';

import {
  QRCodeMapping,
  createQRCodeMapping,
  deleteQRCodeMapping,
  getQRCodesForBuilding,
  getLocations,
  getBuildingsForLocation,
  getFloorsForBuilding,
  getRoomsForFloor,
} from '../services/qrService';

// Types
interface Location {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

interface UseQRCodeAdminReturn {
  // Data state
  locations: Location[];
  buildings: Building[];
  floors: Floor[];
  rooms: Room[];
  qrCodes: QRCodeMapping[];

  // Selection state
  selectedLocationId: string | null;
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  selectedRoom: Room | null;
  selectedQrCode: QRCodeMapping | null;

  // Input state
  qrDescription: string;
  qrValue: string;
  searchQuery: string;

  // UI state
  buildingDropdownOpen: boolean;
  floorDropdownOpen: boolean;
  isAddModalVisible: boolean;
  isGenerateModalVisible: boolean;

  // Loading and error state
  isLoading: boolean;
  error: string | null;

  // Popup states
  showSuccessPopup: boolean;
  successMessage: string;
  showErrorPopup: boolean;
  errorMessage: string;
  showConfirmPopup: boolean;
  confirmMessage: string;
  showInfoPopup: boolean;
  infoTitle: string;
  infoMessage: string;

  // RBAC state
  role: string | null;
  adminLocations: string[];

  // Ref
  qrRef: React.RefObject<QRCode | null>;

  // Actions
  handleLocationSelect: (locationId: string) => void;
  setSelectedBuildingId: (id: string | null) => void;
  setSelectedFloorId: (id: string | null) => void;
  setSelectedRoom: (room: Room | null) => void;
  setQrDescription: (description: string) => void;
  setQrValue: (value: string) => void;
  setSearchQuery: (query: string) => void;
  setBuildingDropdownOpen: (open: boolean) => void;
  setFloorDropdownOpen: (open: boolean) => void;
  setIsAddModalVisible: (visible: boolean) => void;
  setIsGenerateModalVisible: (visible: boolean) => void;
  setShowSuccessPopup: (show: boolean) => void;
  setShowErrorPopup: (show: boolean) => void;
  setShowConfirmPopup: (show: boolean) => void;
  setShowInfoPopup: (show: boolean) => void;

  // Business logic actions
  generateQRValue: () => string;
  handleGenerateQRCode: () => void;
  handleAddQRCode: () => Promise<void>;
  handleDeleteQRCode: (qr: QRCodeMapping) => void;
  handleViewQR: (qr: QRCodeMapping) => void;
  handleQRRef: (ref: QRCode | null) => void;
  confirmAction: () => void;
  resetAddModal: () => void;
}

export const useQRCodeAdmin = (): UseQRCodeAdminReturn => {
  // RBAC
  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);

  // Loading / error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hierarchy data
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCodeMapping[]>([]);

  // Selections
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedQrCode, setSelectedQrCode] = useState<QRCodeMapping | null>(null);

  // Inputs
  const [qrDescription, setQrDescription] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown UI
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  // Popups / modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Error popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation popup state
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActionCallback, setConfirmActionCallback] = useState<() => void>(() => {});

  // Info popup state
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Ref to export QR
  const qrRef = useRef<QRCode | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) return;
        const doc = await firestore().doc(`userInformation/${uid}`).get();
        const data = doc.data();
        setRole(data?.role || 'user');
        setAdminLocations(data?.adminLocations || []);
      } catch (e) {
        ////consoleerror(e);
        setRole('user');
        setAdminLocations([]);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      if (!role) return; // wait for RBAC
      try {
        setIsLoading(true);
        const all = await getLocations();
        const filtered =
          role === 'editor' ? all.filter((loc) => adminLocations.includes(loc.id)) : all;
        setLocations(filtered);
        // Clear downstream selections
        setSelectedLocationId(null);
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
        setBuildings([]);
        setFloors([]);
        setRooms([]);
        setQrCodes([]);
        setError(null);
      } catch (e) {
        ////consoleerror('Error loading locations:', e);
        setError('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };
    loadLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    const loadBuildingsForLocation = async () => {
      if (!selectedLocationId) return;
      try {
        setIsLoading(true);
        const list = await getBuildingsForLocation(selectedLocationId);
        setBuildings(list);
        // reset deeper levels
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
        setFloors([]);
        setRooms([]);
        setQrCodes([]);
        setError(null);
      } catch (e) {
        ////consoleerror('Error loading buildings:', e);
        setError('Failed to load buildings');
      } finally {
        setIsLoading(false);
      }
    };
    loadBuildingsForLocation();
  }, [selectedLocationId]);

  useEffect(() => {
    const loadFloorsAndQRCodes = async () => {
      if (!selectedLocationId || !selectedBuildingId) return;
      try {
        setIsLoading(true);
        const floorsData = await getFloorsForBuilding(selectedLocationId, selectedBuildingId);
        ////consolelog('[QRCodeAdmin] floors count:', floorsData.length, floorsData);
        setFloors(floorsData);
        setSelectedFloorId(null);
        setRooms([]);
        const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
        setQrCodes(codes);
        setError(null);
      } catch (e) {
        ////consoleerror('Error loading floors/QR codes:', e);
        setError('Failed to load floors / QR codes');
      } finally {
        setIsLoading(false);
      }
    };
    loadFloorsAndQRCodes();
  }, [selectedBuildingId, selectedLocationId]);

  useEffect(() => {
    const loadRoomsForFloor = async () => {
      if (!selectedLocationId || !selectedBuildingId || !selectedFloorId) return;
      try {
        const rs = await getRoomsForFloor(selectedLocationId, selectedBuildingId, selectedFloorId);
        setRooms(rs as any);
        setSelectedRoom(null);
        setError(null);
      } catch (e) {
        ////consoleerror('Error loading rooms:', e);
        setError('Failed to load rooms');
      }
    };
    loadRoomsForFloor();
  }, [selectedFloorId, selectedBuildingId, selectedLocationId]);

  const generateQRValue = useCallback(() => {
    const rand = Math.random().toString(36).slice(2, 10);
    return `qr:${selectedLocationId || ''}:${selectedBuildingId || ''}:${selectedFloorId || ''}:${selectedRoom?.id || ''}:${rand}`;
  }, [selectedLocationId, selectedBuildingId, selectedFloorId, selectedRoom]);

  const handleGenerateQRCode = useCallback(() => {
    const v = generateQRValue();
    setQrValue(v);
  }, [generateQRValue]);

  const handleAddQRCode = useCallback(async () => {
    if (!selectedLocationId || !selectedBuildingId || !selectedFloorId) {
      setErrorMessage('Please select a location, building and floor.');
      setShowErrorPopup(true);
      return;
    }
    if (!selectedRoom || !qrValue) {
      setErrorMessage('Please select a room and enter a QR code value.');
      setShowErrorPopup(true);
      return;
    }
    try {
      await createQRCodeMapping(
        selectedLocationId,
        locations.find((l) => l.id === selectedLocationId)?.name || selectedLocationId,
        selectedBuildingId,
        buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId,
        selectedFloorId,
        selectedRoom.id,
        selectedRoom.name,
        qrValue,
        qrDescription,
      );
      // Refresh list
      const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
      setQrCodes(codes);

      setIsAddModalVisible(false);
      setSearchQuery('');
      setSelectedRoom(null);
      setQrValue('');
      setQrDescription('');
      setSuccessMessage('QR code added successfully.');
      setShowSuccessPopup(true);
    } catch (e) {
      ////consoleerror('Error adding QR code:', e);
      setErrorMessage('Failed to add QR code. Please try again.');
      setShowErrorPopup(true);
    }
  }, [
    selectedLocationId,
    selectedBuildingId,
    selectedFloorId,
    selectedRoom,
    qrValue,
    qrDescription,
    locations,
    buildings,
  ]);

  const handleDeleteQRCode = useCallback(
    (qr: QRCodeMapping) => {
      if (!selectedLocationId) {
        setErrorMessage('Location information missing.');
        setShowErrorPopup(true);
        return;
      }
      setConfirmMessage('Are you sure you want to delete this QR code mapping?');
      setConfirmActionCallback(() => async () => {
        try {
          await deleteQRCodeMapping(selectedLocationId, qr.id);
          if (selectedBuildingId) {
            const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
            setQrCodes(codes);
          }
          setSuccessMessage('QR code removed successfully.');
          setShowSuccessPopup(true);
        } catch (e) {
          ////consoleerror('Error deleting QR code:', e);
          setErrorMessage('Failed to delete QR code. Please try again.');
          setShowErrorPopup(true);
        }
      });
      setShowConfirmPopup(true);
    },
    [selectedLocationId, selectedBuildingId],
  );

  const handleViewQR = useCallback((qr: QRCodeMapping) => {
    setSelectedQrCode(qr);
    setQrValue(qr.qrValue);
    setIsGenerateModalVisible(true);
  }, []);

  const handleLocationSelect = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
  }, []);

  const handleQRRef = useCallback((ref: QRCode | null) => {
    qrRef.current = ref;
  }, []);

  const confirmAction = useCallback(() => {
    setShowConfirmPopup(false);
    confirmActionCallback();
  }, [confirmActionCallback]);

  const resetAddModal = useCallback(() => {
    setIsAddModalVisible(false);
    setSelectedRoom(null);
    setQrValue('');
    setQrDescription('');
    setSearchQuery('');
  }, []);

  return {
    // Data state
    locations,
    buildings,
    floors,
    rooms,
    qrCodes,

    // Selection state
    selectedLocationId,
    selectedBuildingId,
    selectedFloorId,
    selectedRoom,
    selectedQrCode,

    // Input state
    qrDescription,
    qrValue,
    searchQuery,

    // UI state
    buildingDropdownOpen,
    floorDropdownOpen,
    isAddModalVisible,
    isGenerateModalVisible,

    // Loading and error state
    isLoading,
    error,

    // Popup states
    showSuccessPopup,
    successMessage,
    showErrorPopup,
    errorMessage,
    showConfirmPopup,
    confirmMessage,
    showInfoPopup,
    infoTitle,
    infoMessage,

    // RBAC state
    role,
    adminLocations,

    // Ref
    qrRef,

    // Actions
    handleLocationSelect,
    setSelectedBuildingId,
    setSelectedFloorId,
    setSelectedRoom,
    setQrDescription,
    setQrValue,
    setSearchQuery,
    setBuildingDropdownOpen,
    setFloorDropdownOpen,
    setIsAddModalVisible,
    setIsGenerateModalVisible,
    setShowSuccessPopup,
    setShowErrorPopup,
    setShowConfirmPopup,
    setShowInfoPopup,

    // Business logic actions
    generateQRValue,
    handleGenerateQRCode,
    handleAddQRCode,
    handleDeleteQRCode,
    handleViewQR,
    handleQRRef,
    confirmAction,
    resetAddModal,
  };
};
