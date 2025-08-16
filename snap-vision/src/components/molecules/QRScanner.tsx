// src/components/molecules/QRScanner.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Vibration,
  TextInput,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  onScan: (qrValue: string) => void;
  onClose: () => void;
}

const SCAN_LOCK_MS = 900;     // shorter lock so we don't miss follow-up scans
const DEDUPE_TTL_MS = 4000;   // ignore the same value within this window

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = Math.min(width, height) * 0.8;

export default function QRScanner({ onScan, onClose }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const [lastValue, setLastValue] = useState<string>('');
  const [manualValue, setManualValue] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [autoScanMode, setAutoScanMode] = useState(true);
  const [manualScanActive, setManualScanActive] = useState(false);

  const lockTimer = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<Camera>(null);
  const seenMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const cameraPermission = await Camera.requestCameraPermission();
        if (cameraPermission === 'granted' || cameraPermission === 'limited') {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          if (cameraPermission === 'denied') {
            Alert.alert(
              'Permission Required',
              'Camera access is blocked. Please enable it in settings.',
              [
                { text: 'Open Settings', onPress: () => Camera.openSettings() },
                { text: 'Cancel', onPress: onClose },
              ]
            );
          }
        }
      } catch (e) {
        console.error('Permission error', e);
        setHasPermission(false);
      }
    };

    requestCameraPermission();
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [onClose]);

  // Camera device & best high-FPS format (helps stability/accuracy)
  const device = useCameraDevice('back');

  useEffect(() => {
    console.log('Camera device:', device ? 'Available' : 'Not available');
    if (device) {
      console.log('Formats available:', device.formats?.length ?? 0);
    }
  }, [device]);

  const bestFormat = useMemo(() => {
    if (!device?.formats?.length) return undefined;
    const sorted = [...device.formats].sort((a, b) => (b.maxFps ?? 0) - (a.maxFps ?? 0));
    // Prefer 60fps+ if present, else highest fps
    return sorted.find(f => (f.maxFps ?? 0) >= 60) ?? sorted[0];
  }, [device]);

  // Helpers
  const now = () => Date.now();

  const extractFirstValue = (codes: any[]) => {
    for (const c of codes) {
      const v =
        (typeof c?.value === 'string' && c.value) ||
        (typeof c?.rawValue === 'string' && c.rawValue);
      if (v) return { value: v, type: c?.type ?? 'unknown' };
    }
    return null;
  };

  const handleBarcodeDetected = useCallback(
    (codes: any[]) => {
      try {
        if (locked) {
          // Still debouncing previous read
          return;
        }
        if (!codes || codes.length === 0) return;

        // Log what the device is reporting (handy for OEM quirks)
        codes.forEach((c, i) =>
          console.log(`Code[${i}] type=${c?.type} value=${c?.value || c?.rawValue}`)
        );

        const hit = extractFirstValue(codes);
        if (!hit) return;

        // Dedupe: ignore the same value within a short TTL window
        const lastTs = seenMapRef.current.get(hit.value) ?? 0;
        if (now() - lastTs < DEDUPE_TTL_MS) {
          console.log('Duplicate within TTL, ignoring:', hit.value);
          return;
        }
        seenMapRef.current.set(hit.value, now());

        // Haptic feedback exactly once per "new" value
        Vibration.vibrate(40);

        setLocked(true);
        if (lockTimer.current) clearTimeout(lockTimer.current);
        lockTimer.current = setTimeout(() => setLocked(false), SCAN_LOCK_MS);

        setLastValue(hit.value);
        onScan(hit.value);
      } catch (err) {
        console.error('handleBarcodeDetected error:', err);
      }
    },
    [locked, onScan]
  );

  const handleManualCodeScanned = useCallback(
    (codes: any[]) => {
      if (!manualScanActive || locked) return;
      setManualScanActive(false);
      handleBarcodeDetected(codes);
    },
    [manualScanActive, locked, handleBarcodeDetected]
  );

  // Vision Camera code scanner configuration
  const codeScanner = useCodeScanner({
    // Include common alternates; some vendors label "qrcode" differently
    codeTypes: ['qr',  'aztec', ],
    onCodeScanned: autoScanMode
      ? handleBarcodeDetected
      : manualScanActive
      ? handleManualCodeScanned
      : undefined,
    // Tighter ROI reduces false reads but stays easy to aim
    regionOfInterest: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
  });

  const handleManualSubmit = () => {
    const v = manualValue.trim();
    if (!v) return;
    setLastValue(v);
    onScan(v);
  };

  const triggerManualScan = () => {
    if (locked) return;
    setIsScanning(true);
    setManualScanActive(true);
    // auto-timeout manual mode after 3s if nothing is found
    setTimeout(() => {
      if (manualScanActive) {
        setManualScanActive(false);
        setIsScanning(false);
      }
    }, 3000);
  };

  const toggleScanMode = () => setAutoScanMode(prev => !prev);

  const handleFocus = async (event: any) => {
    if (!cameraRef.current || locked) return;
    const { locationX, locationY } = event.nativeEvent;
    try {
      setIsScanning(false);
      setTimeout(() => setIsScanning(true), 300);
      // Not all devices expose focus; guard it
      const maybeFocus = (cameraRef.current as any)?.focus;
      if (typeof maybeFocus === 'function') {
        await maybeFocus({ x: locationX / width, y: locationY / height });
      }
    } catch (error) {
      console.log('Focus error:', error);
    }
  };

  const activateEnhancedScanning = () => {
    setTorch('on');
    setTimeout(() => setTorch('off'), 3500);
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', paddingHorizontal: 24 }}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
        >
          <Text style={{ color: '#FFF' }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          torch={torch === 'on' ? 'on' : 'off'}
          enableZoomGesture
          codeScanner={codeScanner}
          format={bestFormat}
          preset="high"
          zoom={1.0}
          focusable={true}
          video={false}
          photo={false}
          audio={false}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Text style={{ color: '#fff' }}>Camera not available</Text>
        </View>
      )}

      {/* Frame overlay + interaction */}
      <View style={styles.overlay} onTouchEnd={handleFocus}>
        <View
          style={[
            styles.qrFrame,
            {
              borderColor: isScanning ? colors.success : colors.primary,
              borderWidth: isScanning ? 3 : 2,
            },
          ]}
        />
        {/* Corner markers */}
        <View style={[styles.cornerTL, { borderColor: colors.success }]} />
        <View style={[styles.cornerTR, { borderColor: colors.success }]} />
        <View style={[styles.cornerBL, { borderColor: colors.success }]} />
        <View style={[styles.cornerBR, { borderColor: colors.success }]} />

        <Text style={[styles.scanningText, { color: colors.text }]}>
          {autoScanMode ? 'Position QR code in frame' : manualScanActive ? 'Scanning...' : 'Tap scan button to capture'}
        </Text>

        {/* Manual scan button (only visible in manual mode) */}
        {!autoScanMode && (
          <TouchableOpacity
            style={[
              styles.scanButton,
              { backgroundColor: manualScanActive ? colors.warning : colors.primary },
            ]}
            onPress={triggerManualScan}
            activeOpacity={0.7}
          >
            <Icon name="scan-outline" size={28} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Top controls */}
      <View className="topBar" style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
          <Icon name="close-circle" size={40} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topControls}>
          <TouchableOpacity
            style={[styles.nativeScanBtn, { backgroundColor: colors.notification }]}
            onPress={activateEnhancedScanning}
          >
            <Icon name="flashlight" size={24} color="#FFFFFF" />
            <Text style={styles.nativeScanText}>Enhance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: autoScanMode ? colors.success : colors.card }]}
            onPress={toggleScanMode}
          >
            <Icon
              name={autoScanMode ? 'scan' : 'scan-outline'}
              size={24}
              color={autoScanMode ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: autoScanMode ? '#FFFFFF' : colors.primary },
              ]}
            >
              {autoScanMode ? 'Auto' : 'Manual'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch(t => (t === 'on' ? 'off' : 'on'))}>
            <Icon name={torch === 'on' ? 'flashlight' : 'flashlight-outline'} size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom hint + debug */}
      <View style={styles.bottomArea}>
        <Text style={[styles.hint, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          Align the QR within the frame
        </Text>

        {lastValue ? (
          <View style={[styles.debugChip, { borderColor: colors.primary }]}>
            <Text style={{ color: '#fff' }} numberOfLines={1}>
              Last read: {lastValue}
            </Text>
          </View>
        ) : null}

        {/* Optional: manual text entry
        <View style={[styles.manualRow, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
          <TextInput
            style={[styles.manualInput, { color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }]}
            placeholder="Or paste/enter code…"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={manualValue}
            onChangeText={setManualValue}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[styles.manualBtn, { backgroundColor: colors.primary }]} onPress={handleManualSubmit}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Go</Text>
          </TouchableOpacity>
        </View>
        */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: { padding: 8 },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  nativeScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
  },
  nativeScanText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#FFFFFF',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 2,
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  cornerTL: {
    position: 'absolute',
    top: (height - FRAME_SIZE) / 2,
    left: (width - FRAME_SIZE) / 2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 15,
  },
  cornerTR: {
    position: 'absolute',
    top: (height - FRAME_SIZE) / 2,
    right: (width - FRAME_SIZE) / 2,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 15,
  },
  cornerBL: {
    position: 'absolute',
    bottom: (height - FRAME_SIZE) / 2,
    left: (width - FRAME_SIZE) / 2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 15,
  },
  cornerBR: {
    position: 'absolute',
    bottom: (height - FRAME_SIZE) / 2,
    right: (width - FRAME_SIZE) / 2,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 15,
  },
  scanningText: {
    position: 'absolute',
    bottom: width * 0.2,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  scanButton: {
    position: 'absolute',
    bottom: width * 0.1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },

  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 10,
  },
  hint: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  debugChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  manualBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },

  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
