// src/components/molecules/QRScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  onScan: (qrValue: string) => void;
  onClose: () => void;
}

const SCAN_LOCK_MS = 1200;

export default function QRScanner({ onScan, onClose }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const [lastValue, setLastValue] = useState<string>('');
  const [manualValue, setManualValue] = useState('');
  const lockTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const camPerm = Platform.select({
          ios: PERMISSIONS.IOS.CAMERA,
          android: PERMISSIONS.ANDROID.CAMERA,
        })!;
        const res = await request(camPerm);
        if (res === RESULTS.GRANTED || res === RESULTS.LIMITED) {
      setHasPermission(true);
    } else {
      setHasPermission(false);
      if (res === RESULTS.BLOCKED) {
        Alert.alert(
          'Permission Required',
          'Camera access is blocked. Please enable it in settings.',
          [
            { text: 'Open Settings', onPress: openSettings },
            { text: 'Cancel', onPress: onClose }
          ]
        );
      }
    }
      } catch (e) {
        console.log('Permission error', e);
        setHasPermission(false);
      }
    };
    requestCameraPermission();
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [onClose]);

  // Enhance your extractValue function:
const extractValue = (event: any): string | undefined => {
  const value = 
    event?.nativeEvent?.codeStringValue ||
    event?.codeStringValue ||
    event?.nativeEvent?.codeString ||
    event?.codeString ||
    event?.nativeEvent?.stringValue ||
    event?.stringValue;

  // Add debug logging
  console.log('Raw scan event:', event);
  console.log('Extracted value:', value);
  
  return value;
};

  // Add performance optimizations:
const handleRead = (event: any) => {
  if (locked) return;
  const value = extractValue(event);
  if (!value) return;

  // Debounce scans
  setLocked(true);
  if (lockTimer.current) clearTimeout(lockTimer.current);
  lockTimer.current = setTimeout(() => setLocked(false), SCAN_LOCK_MS);

  console.log('Valid QR detected:', value); // Debug log
  onScan(value);
};

  const handleManualSubmit = () => {
    const v = manualValue.trim();
    if (!v) return;
    setLastValue(v);
    onScan(v);
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
      <Camera
        style={StyleSheet.absoluteFill}
        cameraType="back"
        zoomMode="off"
        focusMode="on"
        torchMode={torch}
        scanBarcode
        onReadCode={handleRead}
        showFrame
        frameColor={colors.primary}
        laserColor={colors.primary} // Add laser color for visibility
        surfaceColor="transparent"
        frameWidth={250}  // Explicitly set frame dimensions
        frameHeight={250}
      />

      {/* Top controls */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
          <Icon name="close-circle" size={40} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setTorch((t) => (t === 'on' ? 'off' : 'on'))}>
          <Icon name={torch === 'on' ? 'flashlight' : 'flashlight-outline'} size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom hint + debug */}
      <View style={styles.bottomArea}>
        <Text style={[styles.hint, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          Align the QR within the frame
        </Text>

        {lastValue ? (
          <View style={[styles.debugChip, { borderColor: colors.primary }]}>
            <Text style={{ color: '#fff' }} numberOfLines={1}>Last read: {lastValue}</Text>
          </View>
        ) : null}

        {/* Manual fallback */}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    position: 'absolute', top: 30, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  iconBtn: { padding: 8 },

  bottomArea: {
    position: 'absolute', left: 0, right: 0, bottom: 30,
    alignItems: 'center', paddingHorizontal: 16, gap: 10,
  },
  hint: {
    color: '#FFF', fontSize: 16, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
  },
  debugChip: {
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },

  manualRow: {
    flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10,
  },
  manualInput: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8,
  },
  manualBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },

  button: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
