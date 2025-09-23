import { useState, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

interface LocationState {
  latitude: number;
  longitude: number;
}

interface UseMapLocationReturn {
  currentLocation: LocationState | null;
  status: string;
  error: string | null;
  isRefreshingLocation: boolean;
  shouldCenterMap: boolean;
  watchIdRef: React.MutableRefObject<number | null>;
  requestLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  sendLocationToWebView: (
    lat: number,
    lon: number,
    centerMap?: boolean,
    forceZoom?: boolean,
  ) => void;
  setShouldCenterMap: (value: boolean) => void;
  setCurrentLocation: (location: LocationState | null) => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
}

export const useMapLocation = (
  isMapReady: boolean,
  webViewRef: React.RefObject<any>,
  isNavigating: boolean,
): UseMapLocationReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [shouldCenterMap, setShouldCenterMap] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const sendLocationToWebView = (
    lat: number,
    lon: number,
    centerMap = false,
    forceZoom = false,
  ) => {
    setCurrentLocation({ latitude: lat, longitude: lon });

    // Only inject JavaScript if the map is ready
    if (!isMapReady || !webViewRef.current) {
      return;
    }

    let jsCode;
    if (forceZoom || (centerMap && shouldCenterMap)) {
      jsCode = `
        if (window.updateUserLocation) {
          window.updateUserLocation(${lat}, ${lon}, true, 16);
        }
        if (window.centerMapOnUser) {
          window.centerMapOnUser(${lat}, ${lon}, 16);
        }
      `;
    } else {
      jsCode = `
        if (window.updateUserLocation) {
          window.updateUserLocation(${lat}, ${lon}, false);
        }
      `;
    }

    webViewRef.current.injectJavaScript(jsCode);
  };

  const requestLocation = async () => {
    try {
      setStatus('Getting your location...');
      setError(null);

      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted = permissions['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
      const coarseGranted = permissions['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';

      if (!fineGranted && !coarseGranted) {
        setError('Location permission is required to use the map');
        setStatus('Location permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          sendLocationToWebView(latitude, longitude, true, true);
          setStatus('Location found');
          setError(null);
        },
        (err) => {
          setError(`Failed to get location: ${err.message}`);
          setStatus('Location unavailable');
        },
        {
          enableHighAccuracy: true,
          timeout: 25000,
          maximumAge: 10000,
        },
      );
    } catch (err) {
      setError('Failed to request location permissions');
      setStatus('Location setup failed');
    }
  };

  const refreshLocation = async () => {
    setIsRefreshingLocation(true);
    setStatus('Refreshing location...');
    setError(null);
    setShouldCenterMap(true);

    try {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted = permissions['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
      const coarseGranted = permissions['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';

      if (!fineGranted && !coarseGranted) {
        setError('Location permission is required');
        setStatus('Permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          sendLocationToWebView(latitude, longitude, true, true);
          setStatus('Location updated successfully');
          setError(null);
        },
        (err) => {
          setError(`Failed to refresh location: ${err.message}`);
          setStatus('Refresh failed');
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
        },
      );
    } catch (error) {
      setError('Location refresh failed');
      setStatus('Refresh failed');
    } finally {
      setIsRefreshingLocation(false);
    }
  };

  // Dynamic location watching based on navigation state
  useEffect(() => {
    let watchId: number | null = null;

    const startWatchingLocation = async () => {
      try {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted = permissions['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
        const coarseGranted =
          permissions['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';

        if (fineGranted || coarseGranted) {
          const watchOptions = isNavigating
            ? {
                enableHighAccuracy: true,
                distanceFilter: 3, // Update every 3 meters
                interval: 2000, // Update every 2 seconds
                timeout: 25000,
                maximumAge: 8000,
              }
            : Number(Platform.Version) >= 31
              ? {
                  // General browsing - Android 12+
                  enableHighAccuracy: fineGranted,
                  distanceFilter: 5,
                  interval: 2000,
                  timeout: 25000,
                  maximumAge: 15000,
                }
              : {
                  // General browsing - Pre-Android 12
                  enableHighAccuracy: true,
                  distanceFilter: 5,
                  interval: 2000,
                  timeout: 20000,
                  maximumAge: 15000,
                };

          watchId = Geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords;

              if (isNavigating) {
                // Don't center during navigation, let navigation handle it
                sendLocationToWebView(latitude, longitude, false, false);
              } else {
                // Center only on first location or when explicitly requested
                sendLocationToWebView(latitude, longitude, false, false);
              }
            },
            (error) => {
              setError(`Location tracking error: ${error.message}`);
            },
            watchOptions,
          );

          watchIdRef.current = watchId;
        } else {
          setError('Location permissions required for navigation');
        }
      } catch (err) {
        setError('Failed to setup location tracking');
      }
    };

    startWatchingLocation();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isNavigating, isMapReady, webViewRef, shouldCenterMap]);

  // Initial location request on component mount
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      requestLocation();
    }, 1000);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array is fine, we want this to run only once

  // Send current location to map when map becomes ready
  useEffect(() => {
    if (isMapReady && currentLocation && webViewRef.current && shouldCenterMap) {
      sendLocationToWebView(currentLocation.latitude, currentLocation.longitude, true, true);
      setShouldCenterMap(false); // Prevent repeated centering
    }
  }, [isMapReady, currentLocation, shouldCenterMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    currentLocation,
    status,
    error,
    isRefreshingLocation,
    shouldCenterMap,
    watchIdRef,
    requestLocation,
    refreshLocation,
    sendLocationToWebView,
    setShouldCenterMap,
    setCurrentLocation,
    setStatus,
    setError,
  };
};
