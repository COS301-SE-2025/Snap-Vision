import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, StyleSheet } from 'react-native';
import {
  collectWiFiFingerprint,
  deleteWiFiFingerprint,
} from '../../services/WiFiPositioningService';
import StandardPopup from '../atoms/StandardPopup';

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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [showDeleteErrorPopup, setShowDeleteErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

      setShowSuccessPopup(true);
    } catch (err) {
      setErrorMessage('Failed to collect fingerprint.');
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirmation(false);
    setLoading(true);
    try {
      await deleteWiFiFingerprint({
        locationId,
        buildingId,
        floorId,
        coordinates,
      });
      setShowDeleteSuccessPopup(true);
    } catch (err) {
      setErrorMessage('Failed to delete fingerprint.');
      setShowDeleteErrorPopup(true);
    } finally {
      setLoading(false);
    }
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

      {/* Success Popup for Fingerprint Collection */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message="Wi-Fi fingerprint saved successfully!"
        onConfirm={() => {
          setShowSuccessPopup(false);
          onFingerprintCollected?.();
        }}
        confirmText="OK"
        showCancel={false}
      />

      {/* Error Popup for Fingerprint Collection */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorMessage}
        onConfirm={() => {
          setShowErrorPopup(false);
          setErrorMessage('');
        }}
        confirmText="OK"
        showCancel={false}
      />

      {/* Delete Confirmation Popup */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Confirm Delete"
        message="Are you sure you want to delete this WiFi point? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirmation(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Delete Success Popup */}
      <StandardPopup
        visible={showDeleteSuccessPopup}
        title="Deleted"
        message="WiFi fingerprint deleted successfully!"
        onConfirm={() => {
          setShowDeleteSuccessPopup(false);
          onFingerprintCollected?.();
        }}
        confirmText="OK"
        showCancel={false}
      />

      {/* Delete Error Popup */}
      <StandardPopup
        visible={showDeleteErrorPopup}
        title="Error"
        message={errorMessage}
        onConfirm={() => {
          setShowDeleteErrorPopup(false);
          setErrorMessage('');
        }}
        confirmText="OK"
        showCancel={false}
      />
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
