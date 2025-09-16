import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const MINEW_DEFAULT_UUID = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0';

export default function BeaconTestScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [isRawScanning, setIsRawScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [detectedBeacons, setDetectedBeacons] = useState<any[]>([]);
  const [debugEvents, setDebugEvents] = useState<any[]>([]);
  const [rawDevices, setRawDevices] = useState<any[]>([]);
  const [bluetoothStatus, setBluetoothStatus] = useState<{
    available?: boolean;
    enabled?: boolean;
    status?: string;
    name?: string;
    address?: string;
  }>({});

  // Reference to native module and event subscriptions
  const minewRef = React.useRef<any>(null);
  const minewEmitterRef = React.useRef<any>(null);
  const beaconSubRef = React.useRef<any>(null);
  const debugSubRef = React.useRef<any>(null);

  // Add a log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  // Request permissions for BLE scanning
  const requestPermissions = async () => {
    addLog('Requesting permissions...');
    if (Platform.OS !== 'android') {
      addLog('Not on Android, no permissions needed');
      return true;
    }

    const perms = [];
    // Android 12+
    if (Platform.Version >= 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
    // Add location permissions (needed for BLE)
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

    try {
      addLog(`Requesting ${perms.length} permissions...`);
      const results = await PermissionsAndroid.requestMultiple(perms);

      const granted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (granted) {
        addLog('✅ All permissions granted');
        return true;
      } else {
        addLog('❌ Some permissions denied:');
        Object.entries(results).forEach(([perm, result]) => {
          addLog(`  ${perm}: ${result}`);
        });
        return false;
      }
    } catch (err) {
      addLog(`❌ Error requesting permissions: ${err}`);
      return false;
    }
  };

  // Check Bluetooth status
  const checkBluetoothStatus = async () => {
    try {
      addLog('Checking Bluetooth status...');
      const Minew = NativeModules.MinewScanner;
      if (!Minew) {
        addLog('❌ MinewScanner module not found!');
        return false;
      }

      if (!Minew.checkBluetoothStatus) {
        addLog('❌ checkBluetoothStatus method not found!');
        return false;
      }

      const status = await Minew.checkBluetoothStatus();
      setBluetoothStatus(status);

      if (!status.available) {
        addLog(`❌ Bluetooth not available: ${status.status}`);
        return false;
      }

      if (!status.enabled) {
        addLog(`❌ Bluetooth is turned off: ${status.status}`);
        return false;
      }

      addLog(`✅ Bluetooth ready: ${status.status}`);
      if (status.name) addLog(`Device name: ${status.name}`);
      if (status.address) addLog(`Device address: ${status.address}`);

      return true;
    } catch (err) {
      addLog(`❌ Error checking Bluetooth status: ${err}`);
      return false;
    }
  };

  // Setup Minew scanner
  const setupMinew = async () => {
    try {
      addLog('Setting up Minew scanner...');
      const Minew = NativeModules.MinewScanner;
      if (!Minew) {
        addLog('❌ MinewScanner module not found!');
        return false;
      }

      // Check if we can access the Minew SDK
      try {
        const isRunning = await Minew.isRunning();
        addLog(`Minew scanner status: ${isRunning ? 'running' : 'not running'}`);
      } catch (e) {
        addLog(`❌ Error checking Minew status: ${e}`);
      }

      minewRef.current = Minew;
      minewEmitterRef.current = new NativeEventEmitter(Minew);
      addLog('✅ Minew scanner setup complete');
      return true;
    } catch (err) {
      addLog(`❌ Error setting up Minew: ${err}`);
      return false;
    }
  };

  // Start scanning
  const startScan = async () => {
    if (isScanning) {
      addLog('Already scanning, stopping first...');
      await stopScan();
    }

    try {
      addLog('Starting scan...');
      const permsOk = await requestPermissions();
      if (!permsOk) {
        addLog('❌ Cannot start without permissions');
        return;
      }

      // Check Bluetooth status
      const btStatus = await checkBluetoothStatus();
      if (!btStatus) {
        addLog('❌ Bluetooth not ready, cannot scan');
        return;
      }

      if (!(await setupMinew())) {
        addLog('❌ Failed to setup Minew scanner');
        return;
      }

      // Clear previous state
      setDetectedBeacons([]);
      setDebugEvents([]);

      // Setup beacon listener
      addLog('Setting up beacon listener...');
      beaconSubRef.current = minewEmitterRef.current.addListener('onBeacon', (beacon: any) => {
        setDetectedBeacons((prev) => {
          // Check if we already have this beacon
          const existingIndex = prev.findIndex(
            (b) => b.uuid === beacon.uuid && b.major === beacon.major && b.minor === beacon.minor,
          );

          if (existingIndex >= 0) {
            // Update existing beacon
            const newList = [...prev];
            newList[existingIndex] = {
              ...newList[existingIndex],
              rssi: beacon.rssi,
              txPower: beacon.txPower,
              timestamp: beacon.timestamp,
              count: (newList[existingIndex].count || 0) + 1,
              lastSeen: new Date().toLocaleTimeString(),
            };
            return newList;
          } else {
            // Add new beacon
            const isTarget =
              beacon.major === 1 &&
              (beacon.minor === 1 || beacon.minor === 2 || beacon.minor === 3);
            const isCorrectUuid = beacon.uuid?.toLowerCase() === MINEW_DEFAULT_UUID.toLowerCase();

            addLog(
              `📡 New beacon: UUID=${beacon.uuid}, M:${beacon.major}, m:${beacon.minor}, RSSI:${beacon.rssi} ${isTarget ? '✅ TARGET' : ''}`,
            );

            return [
              ...prev,
              {
                ...beacon,
                count: 1,
                firstSeen: new Date().toLocaleTimeString(),
                lastSeen: new Date().toLocaleTimeString(),
                isTarget,
                isCorrectUuid,
              },
            ];
          }
        });
      });

      // Setup debug listener
      addLog('Setting up debug listener...');
      debugSubRef.current = minewEmitterRef.current.addListener('onBeaconDebug', (debug: any) => {
        const timestamp = new Date().toLocaleTimeString();

        setDebugEvents((prev) => [
          {
            ...debug,
            timestamp,
            id: `${timestamp}-${Math.random().toString(36).substr(2, 5)}`,
          },
          ...prev.slice(0, 49),
        ]); // Keep last 50 debug events

        // Also log important debug events
        if (debug.message === 'iBeacon detected') {
          addLog(`🔔 iBeacon detected: UUID=${debug.uuid}, M:${debug.major}, m:${debug.minor}`);
        } else if (debug.message === 'Raw peripheral detected') {
          addLog(`📱 Peripheral: ${debug.mac}, RSSI:${debug.rssi}`);
        }
      });

      // Start scanning with no UUID filter to see everything
      await minewRef.current.startScan({});
      addLog('✅ Scan started');
      setIsScanning(true);
    } catch (err) {
      addLog(`❌ Error starting scan: ${err}`);
    }
  };

  // Stop scanning
  const stopScan = async () => {
    try {
      addLog('Stopping scan...');

      // Remove listeners
      if (beaconSubRef.current) {
        beaconSubRef.current.remove();
        beaconSubRef.current = null;
      }

      if (debugSubRef.current) {
        debugSubRef.current.remove();
        debugSubRef.current = null;
      }

      // Stop native scanner
      if (minewRef.current) {
        await minewRef.current.stopScan();
      }

      addLog('✅ Scan stopped');
      setIsScanning(false);
    } catch (err) {
      addLog(`❌ Error stopping scan: ${err}`);
    }
  };

  // Scan for raw Bluetooth devices using BLE Manager
  const scanRawDevices = async () => {
    if (isRawScanning) {
      addLog('Already scanning for raw devices, stopping first...');
      await stopRawScan();
      return;
    }

    try {
      addLog('Starting raw Bluetooth device scan...');
      const permsOk = await requestPermissions();
      if (!permsOk) {
        addLog('❌ Cannot start raw scan without permissions');
        return;
      }

      // Import BLE Manager
      const BleManager = require('react-native-ble-manager').default;

      // Start BLE Manager
      await BleManager.start({ showAlert: false });
      addLog('✅ BLE Manager started');

      // Check state
      const state = await BleManager.checkState();
      addLog(`Bluetooth state: ${state}`);

      if (state !== 'on') {
        addLog('❌ Bluetooth is not enabled');
        Alert.alert('Bluetooth Required', 'Please enable Bluetooth to scan for devices', [
          { text: 'OK' },
        ]);
        return;
      }

      // Clear previous devices
      setRawDevices([]);

      // Start scan
      addLog('Starting raw BLE scan (5 seconds)...');
      setIsRawScanning(true);

      // Start scan with no filters to see all devices
      await BleManager.scan([], 5, true);

      // Set a timeout to get results
      setTimeout(async () => {
        try {
          // Get discovered devices
          const devices = await BleManager.getDiscoveredPeripherals();
          addLog(`Raw scan found ${devices.length} devices`);

          // Process devices
          const formattedDevices = devices.map((device: any) => ({
            id: device.id,
            name: device.name || 'unnamed',
            rssi: device.rssi,
            isConnectable: !!device.isConnectable,
            timestamp: new Date().toLocaleTimeString(),
            advertising: device.advertising,
            manufacturerData: device.advertising?.manufacturerData?.bytes,
            serviceData: device.advertising?.serviceData,
            serviceUUIDs: device.advertising?.serviceUUIDs,
            // Check if this might be a Minew beacon based on name or service UUIDs
            possibleMinew:
              (device.name && device.name.toLowerCase().includes('minew')) ||
              (device.id && device.id.toLowerCase().includes('minew')) ||
              device.advertising?.serviceUUIDs?.some((uuid: string) =>
                uuid.toLowerCase().includes('e2c56db5'),
              ),
          }));

          // Sort with possible Minew beacons first
          formattedDevices.sort((a, b) => {
            if (a.possibleMinew && !b.possibleMinew) return -1;
            if (!a.possibleMinew && b.possibleMinew) return 1;
            return (b.rssi || -100) - (a.rssi || -100); // Then by signal strength
          });

          setRawDevices(formattedDevices);

          // Log interesting devices
          formattedDevices.forEach((device, index) => {
            if (device.possibleMinew) {
              addLog(`🔍 Possible Minew: ${device.name || device.id} (RSSI: ${device.rssi})`);
            } else if (index < 5) {
              // Only log first few non-Minew devices
              addLog(`📱 Device: ${device.name || device.id} (RSSI: ${device.rssi})`);
            }
          });

          setIsRawScanning(false);
          addLog('Raw scan completed');
        } catch (e) {
          addLog(`❌ Error getting raw devices: ${e}`);
          setIsRawScanning(false);
        }
      }, 6000);
    } catch (e) {
      addLog(`❌ Error in raw scan: ${e}`);
      setIsRawScanning(false);
    }
  };

  const stopRawScan = async () => {
    try {
      const BleManager = require('react-native-ble-manager').default;
      await BleManager.stopScan();
      setIsRawScanning(false);
      addLog('Raw scan stopped');
    } catch (e) {
      addLog(`❌ Error stopping raw scan: ${e}`);
    }
  };

  // Test specific iBeacon values
  const testSpecificBeacon = async () => {
    addLog('Testing for specific beacon values...');
    addLog(`Looking for UUID=${MINEW_DEFAULT_UUID}`);
    addLog('Looking for Major=1, Minors=[1,2,3]');

    // Make logs more visible
    setLogs((prev) => [
      '==== EXPECTED MINEW BEACON CONFIGURATIONS ====',
      `UUID: ${MINEW_DEFAULT_UUID}`,
      'Major: 1',
      'Minors: 1, 2, 3',
      '=======================================',
      ...prev,
    ]);

    // Check Bluetooth status
    await checkBluetoothStatus();

    // Add useful debug info about Minew module
    try {
      if (minewRef.current) {
        addLog(`Is Minew scanner running: ${(await minewRef.current.isRunning()) ? 'YES' : 'NO'}`);
      } else {
        const Minew = NativeModules.MinewScanner;
        if (Minew) {
          addLog(`Is Minew scanner running: ${(await Minew.isRunning()) ? 'YES' : 'NO'}`);
        } else {
          addLog('❌ MinewScanner module not found');
        }
      }
    } catch (e) {
      addLog(`❌ Error checking Minew status: ${e}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScan();
      }
    };
  }, [isScanning]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Beacon Test Mode</Text>
        <View style={styles.spacer} />
      </View>

      {/* Control Panel */}
      <View
        style={[
          styles.controlPanel,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: isScanning ? colors.notification : colors.primary },
            ]}
            onPress={isScanning ? stopScan : startScan}
          >
            <MaterialIcons name={isScanning ? 'stop' : 'play-arrow'} size={20} color="white" />
            <Text style={styles.buttonText}>{isScanning ? 'Stop Scan' : 'Minew Scan'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: isRawScanning ? colors.notification : 'purple' },
            ]}
            onPress={scanRawDevices}
            disabled={isScanning}
          >
            <MaterialIcons name={isRawScanning ? 'stop' : 'search'} size={20} color="white" />
            <Text style={styles.buttonText}>{isRawScanning ? 'Stop Raw' : 'Raw BLE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.secondary }]}
            onPress={testSpecificBeacon}
          >
            <MaterialIcons name="lightbulb" size={20} color="white" />
            <Text style={styles.buttonText}>Beacon Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.border }]}
            onPress={() => {
              setLogs([]);
              setDebugEvents([]);
              setRawDevices([]);
            }}
          >
            <MaterialIcons name="clear" size={20} color="white" />
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'orange' }]}
            onPress={checkBluetoothStatus}
          >
            <MaterialIcons name="bluetooth" size={20} color="white" />
            <Text style={styles.buttonText}>BT Status</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bluetooth Status */}
      {bluetoothStatus.status && (
        <View
          style={[
            styles.btStatusBar,
            {
              backgroundColor: bluetoothStatus.enabled
                ? colors.success + '20'
                : colors.notification + '20',
              borderBottomColor: colors.border,
            },
          ]}
        >
          <MaterialIcons
            name="bluetooth"
            size={16}
            color={bluetoothStatus.enabled ? 'green' : 'red'}
          />
          <Text
            style={[
              styles.btStatusText,
              {
                color: bluetoothStatus.enabled ? 'green' : 'red',
              },
            ]}
          >
            {bluetoothStatus.status}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Stats panel */}
        <View
          style={[
            styles.statsPanel,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.statTitle, { color: colors.text }]}>Beacon Statistics</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {detectedBeacons.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Beacons</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {detectedBeacons.filter((b) => b.isTarget).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Target Beacons</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {debugEvents.filter((d) => d.message === 'Raw peripheral detected').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Peripherals</Text>
            </View>
          </View>
        </View>

        {/* Tabs for different views */}
        <View style={styles.tabContainer}>
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={[styles.tabHeaderText, { color: colors.primary }]}>
                {rawDevices.length > 0
                  ? `Raw BLE Devices (${rawDevices.length})`
                  : 'No Raw Devices'}
              </Text>
              <Text style={[styles.tabHeaderText, { color: colors.primary }]}>
                {detectedBeacons.length > 0
                  ? `Minew Beacons (${detectedBeacons.length})`
                  : 'No Minew Beacons'}
              </Text>
            </View>

            <View style={styles.tabBody}>
              <ScrollView
                style={[styles.tabPanel, { borderColor: colors.border }]}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {rawDevices.length === 0 ? (
                  <Text style={[styles.emptyMessage, { color: colors.secondary }]}>
                    No raw devices detected yet.{'\n'}Try the "Raw BLE" scan.
                  </Text>
                ) : (
                  rawDevices.map((device, index) => (
                    <View
                      key={device.id || index}
                      style={[
                        styles.deviceItem,
                        {
                          backgroundColor: device.possibleMinew
                            ? colors.notification + '20'
                            : colors.card,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.deviceHeader}>
                        <Text style={[styles.deviceTitle, { color: colors.text }]}>
                          {device.possibleMinew ? '🔍 ' : ''}
                          {device.name || 'Unknown'}
                        </Text>
                        <Text
                          style={[
                            styles.deviceRssi,
                            { color: device.rssi > -70 ? 'green' : colors.notification },
                          ]}
                        >
                          RSSI: {device.rssi} dB
                        </Text>
                      </View>
                      <Text style={[styles.deviceDetail, { color: colors.secondary }]}>
                        ID: {device.id || 'Unknown'}
                      </Text>
                      {device.serviceUUIDs && device.serviceUUIDs.length > 0 && (
                        <Text style={[styles.deviceDetail, { color: colors.secondary }]}>
                          Services: {device.serviceUUIDs.slice(0, 1).join(', ')}
                          {device.serviceUUIDs.length > 1 ? '...' : ''}
                        </Text>
                      )}
                      <Text style={[styles.deviceDetail, { color: colors.secondary }]}>
                        Connectable: {device.isConnectable ? 'Yes' : 'No'}
                      </Text>
                      <Text style={[styles.deviceDetail, { color: colors.secondary }]}>
                        Seen: {device.timestamp}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <ScrollView
                style={[styles.tabPanel, { borderColor: colors.border }]}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {detectedBeacons.length === 0 ? (
                  <Text style={[styles.emptyMessage, { color: colors.secondary }]}>
                    No Minew beacons detected yet.{'\n'}Try the "Minew Scan" button.
                  </Text>
                ) : (
                  detectedBeacons.map((beacon, index) => (
                    <View
                      key={`${beacon.uuid}-${beacon.major}-${beacon.minor}`}
                      style={[
                        styles.beaconItem,
                        {
                          backgroundColor: beacon.isTarget ? colors.primary + '20' : colors.card,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.beaconHeader}>
                        <Text style={[styles.beaconTitle, { color: colors.text }]}>
                          Beacon {index + 1} {beacon.isTarget ? '✅' : ''}
                        </Text>
                        <Text style={[styles.beaconRssi, { color: colors.notification }]}>
                          RSSI: {beacon.rssi} dB
                        </Text>
                      </View>
                      <Text style={[styles.beaconDetail, { color: colors.secondary }]}>
                        UUID: {beacon.uuid}
                      </Text>
                      <Text style={[styles.beaconDetail, { color: colors.secondary }]}>
                        Major: {beacon.major}, Minor: {beacon.minor}
                      </Text>
                      <Text style={[styles.beaconDetail, { color: colors.secondary }]}>
                        TxPower: {beacon.txPower || 'N/A'} | Count: {beacon.count}
                      </Text>
                      <Text style={[styles.beaconDetail, { color: colors.secondary }]}>
                        Last seen: {beacon.lastSeen}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.logOutput}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Output</Text>
            <ScrollView style={[styles.scrollView, { borderColor: colors.border }]}>
              {logs.length === 0 && (
                <Text style={[styles.emptyMessage, { color: colors.secondary }]}>No logs yet</Text>
              )}
              {logs.map((log, index) => (
                <Text
                  key={index}
                  style={[
                    styles.logLine,
                    { color: log.includes('❌') ? colors.notification : colors.text },
                  ]}
                >
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  btStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  btStatusText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  spacer: {
    flex: 1,
  },
  controlPanel: {
    padding: 12,
    borderBottomWidth: 1,
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  statsPanel: {
    padding: 12,
    borderBottomWidth: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  tabContent: {
    flex: 1,
    padding: 0,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  tabHeaderText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabBody: {
    flex: 1,
    flexDirection: 'row',
  },
  tabPanel: {
    flex: 1,
    padding: 8,
    margin: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  deviceItem: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  deviceRssi: {
    fontSize: 12,
    fontWeight: '500',
  },
  deviceDetail: {
    fontSize: 11,
    marginVertical: 1,
  },
  beaconList: {
    flex: 1,
    padding: 12,
    borderRightWidth: 0.5,
  },
  logOutput: {
    flex: 1,
    padding: 12,
    borderLeftWidth: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  beaconItem: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  beaconHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  beaconTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  beaconRssi: {
    fontSize: 14,
    fontWeight: '500',
  },
  beaconDetail: {
    fontSize: 12,
    marginVertical: 1,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  emptyMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
