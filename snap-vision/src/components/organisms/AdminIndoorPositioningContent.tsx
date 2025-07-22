import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  Switch,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import {
  WiFiPositioningService,
  WiFiFingerprint,
  BuildingFingerprintStats,
} from '../../services/WiFiPositioningService';
import WiFiFingerprintCollector from '../molecules/WiFiFingerprintCollector';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  buildingId: string;
  floorId: string;
  onBack: () => void;
}

export default function AdminIndoorPositioningContent({ buildingId, floorId, onBack }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [fingerprints, setFingerprints] = useState<WiFiFingerprint[]>([]);
  const [stats, setStats] = useState<BuildingFingerprintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Collection mode state
  const [isCollectionMode, setIsCollectionMode] = useState(false);
  const [collectionCoords, setCollectionCoords] = useState({ x: '', y: '' });
  const [collectionDescription, setCollectionDescription] = useState('');
  const [collectionType, setCollectionType] = useState<
    'room_center' | 'corridor_point' | 'junction' | 'doorway'
  >('corridor_point');

  const wifiService = WiFiPositioningService.getInstance();

  useEffect(() => {
    loadData();
  }, [buildingId, floorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fingerprintsData, statsData] = await Promise.all([
        wifiService.getFingerprints(buildingId, floorId),
        wifiService.getBuildingFingerprintStats(buildingId),
      ]);

      setFingerprints(fingerprintsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load positioning data:', error);
      Alert.alert('Error', 'Failed to load WiFi positioning data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const deleteFingerprint = async (fingerprintId: string) => {
    Alert.alert('Delete Fingerprint', 'Are you sure you want to delete this WiFi fingerprint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await wifiService.deleteFingerprint(fingerprintId);
            await loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete fingerprint');
          }
        },
      },
    ]);
  };

  const testPositioning = async () => {
    try {
      const position = await wifiService.getCurrentPosition(buildingId, floorId);
      Alert.alert(
        'Current Position',
        `Estimated Location:\nX: ${position.coordinates.x.toFixed(2)}\nY: ${position.coordinates.y.toFixed(2)}\nConfidence: ${(position.confidence * 100).toFixed(1)}%`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      Alert.alert('Positioning Failed', error.message);
    }
  };

  const addManualFingerprint = () => {
    if (!collectionCoords.x || !collectionCoords.y || !collectionDescription.trim()) {
      Alert.alert('Missing Information', 'Please fill in coordinates and description');
      return;
    }

    const coordinates = {
      x: parseFloat(collectionCoords.x),
      y: parseFloat(collectionCoords.y),
    };

    if (isNaN(coordinates.x) || isNaN(coordinates.y)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid numeric coordinates');
      return;
    }

    setIsCollectionMode(false);
  };

  const renderFingerprintItem = ({ item }: { item: WiFiFingerprint }) => (
    <View style={[styles.fingerprintItem, { backgroundColor: colors.card }]}>
      <View style={styles.fingerprintHeader}>
        <Text style={[styles.fingerprintTitle, { color: colors.text }]}>{item.description}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFingerprint(item.id)}>
          <Icon name="delete" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.fingerprintCoords, { color: colors.secondary }]}>
        Location: ({item.coordinates.x.toFixed(1)}, {item.coordinates.y.toFixed(1)})
      </Text>

      <Text style={[styles.fingerprintNetworks, { color: colors.secondary }]}>
        {item.wifiNetworks.length} networks • {item.metadata?.type || 'unknown'}
      </Text>

      <Text style={[styles.fingerprintDate, { color: colors.secondary }]}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loading, { color: colors.text }]}>Loading positioning data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={onBack}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Indoor Positioning Admin</Text>
      </View>

      {/* Stats Card */}
      {stats && (
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>📊 Building Statistics</Text>
          <View style={styles.statsRow}>
            <Text style={[styles.statItem, { color: colors.secondary }]}>
              Total Floors: {stats.totalFloors}
            </Text>
            <Text style={[styles.statItem, { color: colors.secondary }]}>
              Total Points: {stats.totalFingerprints}
            </Text>
          </View>
          <Text style={[styles.statItem, { color: colors.secondary }]}>
            Current Floor: {fingerprints.length} fingerprints
          </Text>
        </View>
      )}

      {/* Test Positioning */}
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.primary }]}
        onPress={testPositioning}
      >
        <Icon name="location-on" size={20} color="white" />
        <Text style={styles.testButtonText}>Test Current Position</Text>
      </TouchableOpacity>

      {/* Collection Mode Toggle */}
      <View style={[styles.toggleCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.toggleTitle, { color: colors.text }]}>📍 Manual Collection Mode</Text>
        <Switch
          value={isCollectionMode}
          onValueChange={setIsCollectionMode}
          trackColor={{ false: colors.secondary, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>

      {/* Manual Collection Form */}
      {isCollectionMode && (
        <View style={[styles.collectionForm, { backgroundColor: colors.card }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Add WiFi Fingerprint</Text>

          <View style={styles.coordsRow}>
            <TextInput
              style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="X coordinate"
              placeholderTextColor={colors.secondary}
              value={collectionCoords.x}
              onChangeText={(text) => setCollectionCoords((prev) => ({ ...prev, x: text }))}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Y coordinate"
              placeholderTextColor={colors.secondary}
              value={collectionCoords.y}
              onChangeText={(text) => setCollectionCoords((prev) => ({ ...prev, y: text }))}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            style={[
              styles.descriptionInput,
              { backgroundColor: colors.surface, color: colors.text },
            ]}
            placeholder="Location description (e.g., 'Room 101 center', 'Hallway junction')"
            placeholderTextColor={colors.secondary}
            value={collectionDescription}
            onChangeText={setCollectionDescription}
            multiline
          />

          {collectionCoords.x && collectionCoords.y && collectionDescription && (
            <WiFiFingerprintCollector
              buildingId={buildingId}
              floorId={floorId}
              coordinates={{
                x: parseFloat(collectionCoords.x),
                y: parseFloat(collectionCoords.y),
              }}
              description={collectionDescription}
              type={collectionType}
              onFingerprintCollected={() => {
                setCollectionCoords({ x: '', y: '' });
                setCollectionDescription('');
                loadData();
              }}
            />
          )}
        </View>
      )}

      {/* Existing Fingerprints */}
      <View style={[styles.fingerprintsSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📶 WiFi Fingerprints ({fingerprints.length})
        </Text>

        {fingerprints.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No WiFi fingerprints collected yet. Enable collection mode to add some.
          </Text>
        ) : (
          <FlatList
            data={fingerprints}
            renderItem={renderFingerprintItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    fontSize: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  collectionForm: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  coordInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  descriptionInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 60,
  },
  fingerprintsSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  fingerprintItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  fingerprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fingerprintTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  fingerprintCoords: {
    fontSize: 12,
    marginBottom: 2,
  },
  fingerprintNetworks: {
    fontSize: 12,
    marginBottom: 2,
  },
  fingerprintDate: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
