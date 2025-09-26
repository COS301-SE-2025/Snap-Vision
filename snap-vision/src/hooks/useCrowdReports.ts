import { useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { POI } from './useMapPOI';
import { useBadges } from '../context/BadgeContext';

export interface CrowdReport {
  buildingId: string;
  buildingName: string;
  density: 'low' | 'moderate' | 'high' | 'very-high';
  timestamp: any;
  reportedBy: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  expiresAt: Date;
}

interface UseCrowdReportsReturn {
  // State
  showCrowdPopup: boolean;
  selectedDensity: string;
  showReportTooltip: boolean;
  crowdReports: Record<string, CrowdReport>;

  // Functions
  submitCrowdReport: (selectedPOI: POI | null) => Promise<void>;
  fetchRecentCrowdReports: () => Promise<void>;
  openCrowdReportModal: (
    selectedFeature: POI | null,
    destination: string,
    destinationCoords: number[] | null,
    pois: POI[],
    setSelectedPOI: (poi: POI | null) => void,
  ) => void;
  closeCrowdReportModal: () => void;
  handleReportTooltipShow: () => void;
  handleReportTooltipHide: () => void;

  // Setters
  setShowCrowdPopup: (show: boolean) => void;
  setSelectedDensity: (density: string) => void;
  setShowReportTooltip: (show: boolean) => void;
}

export const useCrowdReports = (
  isMapReady: boolean,
  webViewRef: React.RefObject<any>,
  setStatus: (status: string) => void,
  setError: (error: string | null) => void,
): UseCrowdReportsReturn => {
  // Badge context
  const { unlock } = useBadges();

  // State
  const [showCrowdPopup, setShowCrowdPopup] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState('moderate');
  const [showReportTooltip, setShowReportTooltip] = useState(false);
  const [crowdReports, setCrowdReports] = useState<Record<string, CrowdReport>>({});

  // Submit crowd report to Firestore
  const submitCrowdReport = useCallback(
    async (selectedPOI: POI | null) => {
      if (!selectedPOI || !selectedDensity) {
        setError('Please select a building and density level');
        return;
      }

      try {
        // Save report to Firestore
        await firestore()
          .collection('crowdReports')
          .add({
            buildingId: selectedPOI.id,
            buildingName: selectedPOI.name,
            density: selectedDensity,
            timestamp: firestore.FieldValue.serverTimestamp(),
            reportedBy: auth().currentUser?.uid || 'anonymous',
            centroid: selectedPOI.centroid,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          });

        // Update UI
        if (isMapReady && webViewRef.current) {
          const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${selectedPOI.centroid.latitude}, ${selectedPOI.centroid.longitude}, '${selectedDensity}', '${selectedPOI.id}');`;
          webViewRef.current.injectJavaScript(jsCrowdCode);
        }

        setShowCrowdPopup(false);
        setStatus(`Crowd density reported for ${selectedPOI.name}`);

        // Unlock the reported-crowd badge
        try {
          await unlock('reported-crowd');
        } catch (badgeError) {
          // Don't fail the whole operation if badge unlock fails
          console.warn('Failed to unlock reported-crowd badge:', badgeError);
        }

        // Refresh crowd reports to get the latest data
        await fetchRecentCrowdReports();
      } catch (error) {
        //consoleerror('Error saving crowd report:', error);
        setError('Failed to submit crowd report');
      }
    },
    [selectedDensity, isMapReady, webViewRef, setStatus, setError, unlock],
  );

  // Fetch recent crowd reports from Firestore
  const fetchRecentCrowdReports = useCallback(async () => {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const snapshot = await firestore()
        .collection('crowdReports')
        .where('timestamp', '>', oneHourAgo)
        .get();

      const reports: Record<string, CrowdReport> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as CrowdReport;
        // If multiple reports exist for the same building, take the most recent
        if (!reports[data.buildingId] || reports[data.buildingId].timestamp < data.timestamp) {
          reports[data.buildingId] = data;
        }
      });

      setCrowdReports(reports);

      // Update crowd indicators on map
      if (isMapReady && webViewRef.current) {
        Object.values(reports).forEach((report) => {
          if (report.centroid) {
            const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${report.centroid.latitude}, ${report.centroid.longitude}, '${report.density}', '${report.buildingId}');`;
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(jsCrowdCode);
            }
          }
        });
      }
    } catch (error) {
      //consoleerror('Error fetching crowd reports:', error);
      // More informative error handling
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 'firestore/permission-denied'
      ) {
        setError('Crowd reports feature unavailable: Permission error');
      }
    }
  }, [isMapReady, webViewRef, setError]);

  // Open crowd report modal with smart POI selection
  const openCrowdReportModal = useCallback(
    (
      selectedFeature: POI | null,
      destination: string,
      destinationCoords: number[] | null,
      pois: POI[],
      setSelectedPOI: (poi: POI | null) => void,
    ) => {
      // If user has selected a POI on map, use that as default
      if (selectedFeature) {
        setSelectedPOI(selectedFeature);
      } else if (destination && destinationCoords) {
        // If user has a destination set in the search bar but no selected feature,
        // find the corresponding POI
        const matchingPOI = pois.find(
          (poi) =>
            poi.name === destination ||
            (poi.centroid &&
              poi.centroid.longitude === destinationCoords[0] &&
              poi.centroid.latitude === destinationCoords[1]),
        );

        if (matchingPOI) {
          setSelectedPOI(matchingPOI);
        }
      }

      setShowCrowdPopup(true);
    },
    [],
  );

  // Close crowd report modal
  const closeCrowdReportModal = useCallback(() => {
    setShowCrowdPopup(false);
  }, []);

  // Report tooltip handlers
  const handleReportTooltipShow = useCallback(() => {
    setShowReportTooltip(true);
  }, []);

  const handleReportTooltipHide = useCallback(() => {
    setShowReportTooltip(false);
  }, []);

  // Fetch crowd reports periodically when map is ready
  useEffect(() => {
    if (isMapReady) {
      fetchRecentCrowdReports();
      const interval = setInterval(fetchRecentCrowdReports, 5 * 60 * 1000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [isMapReady, fetchRecentCrowdReports]);

  return {
    // State
    showCrowdPopup,
    selectedDensity,
    showReportTooltip,
    crowdReports,

    // Functions
    submitCrowdReport,
    fetchRecentCrowdReports,
    openCrowdReportModal,
    closeCrowdReportModal,
    handleReportTooltipShow,
    handleReportTooltipHide,

    // Setters
    setShowCrowdPopup,
    setSelectedDensity,
    setShowReportTooltip,
  };
};
