// src/components/molecules/QrCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRScanner from './QRScanner';
import { getQRCodeMappingByValue } from '../../services/qrService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface Props {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
}

// Adjust these to match your real navigator params
type RootStackParamList = {
  IndoorNavigationInterface: {
    locationId: string;        // real location (e.g., "up-campus")
    buildingId: string;        // building to open
    buildingName?: string;     // for UI
    startRoomId?: string;      // use QR room as start
    qrScanResult?: string;     // raw QR value (for debug)
  };
};

export default function QrCard({ backgroundColor, titleColor }: Props) {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleQRScan = async (qrValue: string) => {
    setProcessing(true);
    setScannerVisible(false);
    setError(null);

    try {
      const qrMapping = await getQRCodeMappingByValue(qrValue);

      if (!qrMapping) {
        setError('Invalid QR code. Please try again.');
        Alert.alert('QR not found', 'No mapping exists for this QR code.');
        return;
      }

      // Use the mapping as saved by createQRCodeMapping
      const {
        locationId,
        buildingId,
        buildingName,
        roomId,
      } = qrMapping;

      if (!locationId || !buildingId || !roomId) {
        setError('QR code is incomplete. Please try another one.');
        return;
      }

      // Navigate with correct params for your Indoor Navigation screen
      navigation.navigate('IndoorNavigationInterface', {
        locationId,
        buildingId,
        buildingName,
        startRoomId: roomId,        // set the start position!
        qrScanResult: qrValue,
      });
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError('Error processing QR code. Please try again.');
      Alert.alert('Scan error', 'Something went wrong while processing the code.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.qrContainer, { backgroundColor }]}
        onPress={() => setScannerVisible(true)}
        disabled={processing}
      >
        <Icon name="camera-outline" size={20} color="#f7d85c" />
        <View style={{ marginLeft: 6 }}>
          <Text style={[styles.qrTitle, { color: titleColor }]}>
            {processing ? 'Processing…' : 'Scan a nearby QR code'}
          </Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </TouchableOpacity>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <QRScanner onScan={handleQRScan} onClose={() => setScannerVisible(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderColor: '#f7d85c',
    borderWidth: 1,
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 10,
    marginTop: 4,
    color: '#ff5252',
  },
});
