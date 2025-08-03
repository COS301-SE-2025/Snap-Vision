import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { collectWiFiFingerprint } from '../../services/WiFiPositioningService';

interface Props {
  locationId: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  description: string;
  type: string;
  onFingerprintCollected?: () => void;
}

export default function WiFiFingerprintCollector({
  locationId,
  buildingId,
  floorId,
  coordinates,
  description,
  type,
  onFingerprintCollected,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleCollect = async () => {
    setLoading(true);
    try {
      await collectWiFiFingerprint({
        locationId,
        buildingId,
        floorId,
        coordinates,
        description,
        type,
      });

      Alert.alert('Success', 'Wi-Fi fingerprint saved.');
      onFingerprintCollected?.();
    } catch (err) {
      Alert.alert('Error', 'Failed to collect fingerprint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Collect WiFi Fingerprint" onPress={handleCollect} disabled={loading} />
      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}
      <Text style={styles.note}>
        Make sure Wi-Fi is enabled. Signal strength is recorded at this location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  note: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
});
