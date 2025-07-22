import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { WiFiPositioningService, WiFiFingerprint } from '../../services/WiFiPositioningService';
import { PermissionService } from '../../services/PermissionService';

interface Props {
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  description: string;
  roomId?: string;
  roomName?: string;
  type?: 'room_center' | 'corridor_point' | 'junction' | 'doorway';
  onFingerprintCollected?: (fingerprint: WiFiFingerprint) => void;
  style?: any;
}

export default function WiFiFingerprintCollector({
  buildingId,
  floorId,
  coordinates,
  description,
  roomId,
  roomName,
  type = 'corridor_point',
  onFingerprintCollected,
  style,
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastFingerprint, setLastFingerprint] = useState<WiFiFingerprint | null>(null);

  const wifiService = WiFiPositioningService.getInstance();

  const collectFingerprint = async () => {
    setIsCollecting(true);

    try {
      // Check permissions first
      const permissionService = PermissionService.getInstance();
      const hasPermissions = await permissionService.checkWiFiPermissions();

      if (!hasPermissions) {
        permissionService.showPermissionExplanation();
        setIsCollecting(false);
        return;
      }

      // Collect WiFi fingerprint
      const fingerprint = await wifiService.collectFingerprint(
        buildingId,
        floorId,
        coordinates,
        description,
        { roomId, roomName, type },
      );

      setLastFingerprint(fingerprint);

      // Call callback if provided
      if (onFingerprintCollected) {
        onFingerprintCollected(fingerprint);
      }

      Alert.alert(
        'Success!',
        `WiFi fingerprint collected for ${description}\n\nFound ${fingerprint.wifiNetworks.length} networks`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('Fingerprint collection failed:', error);

      let errorMessage = 'Failed to collect WiFi fingerprint';
      if (error.message) {
        if (error.message.includes('permission')) {
          errorMessage = 'Location permissions are required for WiFi scanning';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert('Collection Failed', errorMessage);
    } finally {
      setIsCollecting(false);
    }
  };

  const viewLastFingerprint = () => {
    if (!lastFingerprint) return;

    const networks = lastFingerprint.wifiNetworks
      .slice(0, 5) // Show top 5 networks
      .map((n) => `${n.SSID}: ${n.level}dBm`)
      .join('\n');

    Alert.alert(
      'Last Collected Fingerprint',
      `Location: ${lastFingerprint.description}\nNetworks:\n${networks}`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📶 WiFi Positioning</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>{description}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.collectButton,
          {
            backgroundColor: isCollecting ? colors.secondary : colors.primary,
            opacity: isCollecting ? 0.7 : 1,
          },
        ]}
        onPress={collectFingerprint}
        disabled={isCollecting}
      >
        {isCollecting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.buttonText}>Scanning WiFi...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Collect WiFi Fingerprint</Text>
        )}
      </TouchableOpacity>

      {lastFingerprint && (
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: colors.secondary }]}
          onPress={viewLastFingerprint}
        >
          <Text style={styles.buttonText}>View Last Fingerprint</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.instructions, { color: colors.secondary }]}>
        Stand still and tap "Collect WiFi Fingerprint" to scan for nearby networks.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  collectButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  viewButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructions: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
