// Updated WiFiFingerprintCollector.tsx with delete support
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { collectWiFiFingerprint, deleteWiFiFingerprint } from '../../services/WiFiPositioningService';

interface Props {
  locationId: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  coordinates: { x: number; y: number };
  description: string;
  type: string;
  onFingerprintCollected?: () => void;
}

export default function WiFiFingerprintCollector({
  locationId,
  buildingId,
  buildingName,
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
        buildingName,
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

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this point?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteWiFiFingerprint({
              locationId,
              buildingId,
              floorId,
              coordinates,
            });
            Alert.alert('Deleted', 'Fingerprint deleted successfully.');
            onFingerprintCollected?.();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete fingerprint.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Button title="Collect WiFi Fingerprint" onPress={handleCollect} disabled={loading} />
      <View style={{ height: 8 }} />
      <Button title="Delete This Point" onPress={handleDelete} disabled={loading} color="red" />
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
