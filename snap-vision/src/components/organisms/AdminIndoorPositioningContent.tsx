import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import WiFiFingerprintCollector from '../molecules/WiFiFingerprintCollector';
import SettingsHeader from '../molecules/SettingsHeader';

export default function AdminIndoorPositioningContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const webViewRef = useRef<WebView>(null);

  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [floorplans, setFloorplans] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<any | null>(null);
  const [selectedBuildingName, setSelectedBuildingName] = useState<string | null>(null);
  const [buildingDropdownItems, setBuildingDropdownItems] = useState<{ label: string; value: string }[]>([]);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pointName, setPointName] = useState('');
  const [existingPoints, setExistingPoints] = useState<{ id: string; x: number; y: number }[]>([]);
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      const doc = await firestore().doc(`userInformation/${uid}`).get();
      const data = doc.data();
      setRole(data?.role || 'user');
      setAdminLocations(data?.adminLocations || []);
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      const locSnap = await firestore().collection('locations').get();
      const all = locSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
      const filtered = role === 'editor' ? all.filter(loc => adminLocations.includes(loc.id)) : all;
      setLocations(filtered);
    };
    if (role) fetchLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!selectedLocation) return;
      const snap = await firestore().collection(`locations/${selectedLocation}/buildingPOIs`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
      setBuildings(list);
      setBuildingDropdownItems(list.map((b) => ({ label: b.name, value: b.id })));
      setSelectedBuildingId(null);
      setSelectedFloorplan(null);
    };
    if (selectedLocation) fetchBuildings();
  }, [selectedLocation]);

  useEffect(() => {
    const fetchFloorplans = async () => {
      if (!selectedLocation || !selectedBuildingId) return;
      const snap = await firestore()
        .collection(`locations/${selectedLocation}/buildingPOIs/${selectedBuildingId}/floorplans`)
        .get();
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return {
          locationId: selectedLocation,
          buildingId: selectedBuildingId,
          floorLabel: d.floorLabel || doc.id,
          downloadURL: d.downloadURL,
          id: `${selectedBuildingId}_${d.floorLabel || doc.id}`,
        };
      });
      setFloorplans(list);
    };
    if (selectedBuildingId) fetchFloorplans();
  }, [selectedBuildingId]);

  const fetchPoints = async () => {
    if (!selectedLocation || !selectedBuildingId || !selectedFloorplan) return;
    const snap = await firestore()
      .collection(`locations/${selectedLocation}/wifiFingerprints`)
      .where('buildingId', '==', selectedBuildingId)
      .where('floorId', '==', selectedFloorplan.floorLabel)
      .get();

    const list = snap.docs.map(doc => ({
      id: doc.id,
      x: doc.data().coordinates?.x,
      y: doc.data().coordinates?.y,
    }));
    setExistingPoints(list);
  };

  useEffect(() => {
    fetchPoints();
  }, [selectedFloorplan, coords, pointName]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap') {
        setCoords({ x: data.x, y: data.y });
        Alert.alert('Coordinates selected', `X: ${data.x.toFixed(3)}, Y: ${data.y.toFixed(3)}`);
      } else if (data.type === 'delete' && data.id) {
        Alert.alert('Delete fingerprint?', 'Are you sure you want to delete this point?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await firestore()
                .collection(`locations/${selectedLocation}/wifiFingerprints`)
                .doc(data.id)
                .delete();
              fetchPoints();
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Invalid message from WebView', err);
    }
  };

  const getHTML = () => {
    const markers = existingPoints
      .map(
        (p) => `<div onclick="onDelete(this)" data-id="${p.id}" style="position:absolute;left:${p.x * 100}%;top:${p.y * 100}%;
        transform:translate(-50%,-50%);width:20px;height:20px;border-radius:6px;
        background:red;border:2px solid white;"></div>`
      )
      .join('');

    const currentMarker = coords
      ? `<div id="marker" style="position:absolute;left:${coords.x * 100}%;top:${coords.y * 100}%;
        transform:translate(-50%,-50%);width:14px;height:14px;border-radius:7px;
        background:blue;border:2px solid white;"></div>`
      : '';

    return `
      <html>
        <body style="margin:0;padding:0;overflow:hidden;background:${colors.background}">
          <div style="position:relative;width:100%;height:100%;overflow:auto;">
            <img id="floorplan" src="${selectedFloorplan.downloadURL}" style="width:100%;height:auto;object-fit:contain;" />
            ${markers}
            ${currentMarker}
          </div>
          <script>
            const floorplan = document.getElementById('floorplan');
            floorplan.addEventListener('click', function(e) {
              const rect = floorplan.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', x, y }));
            });
            function onDelete(el) {
              const id = el.getAttribute('data-id');
              if (id) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'delete', id }));
              }
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Positioning" />
      <ScrollView style={styles.scroll}>
        {/* Location Select */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.primary }]}>Step 1: Select Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.item,
                  { backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  setSelectedLocation(loc.id);
                  setSelectedBuildingId(null);
                  setSelectedFloorplan(null);
                  setCoords(null);
                }}
              >
                <Text style={{ color: selectedLocation === loc.id ? '#FFF' : colors.text }}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Building Select */}
        {selectedLocation && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Step 2: Select Building</Text>
            <DropDownPicker
              open={buildingDropdownOpen}
              setOpen={setBuildingDropdownOpen}
              items={buildingDropdownItems}
              setItems={setBuildingDropdownItems}
              value={selectedBuildingId}
              setValue={(val) => {
                const id = val();
                setSelectedBuildingId(id);
                setSelectedBuildingName(buildings.find((b) => b.id === id)?.name || '');
              }}
              searchable
              placeholder="Select a building"
              zIndex={3000}
              zIndexInverse={1000}
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Floor Select */}
        {selectedBuildingId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Step 3: Select Floor</Text>
            <DropDownPicker
              open={floorDropdownOpen}
              setOpen={setFloorDropdownOpen}
              items={floorplans.map((fp) => ({ label: `Floor ${fp.floorLabel}`, value: fp.id }))}
              value={selectedFloorplan?.id || null}
              setValue={(val) => {
                const match = floorplans.find((fp) => fp.id === val());
                setSelectedFloorplan(match || null);
                setCoords(null);
              }}
              placeholder="Select a floor"
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Floorplan View */}
        {selectedFloorplan && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>
              Step 4: Tap to Select Coordinates
            </Text>
            <View style={{ height: 300, marginVertical: 12 }}>
              <WebView ref={webViewRef} source={{ html: getHTML() }} onMessage={handleMessage} originWhitelist={['*']} />
            </View>

            {coords && (
              <>
                <TextInput
                  style={{
                    borderColor: colors.primary,
                    borderWidth: 1,
                    padding: 8,
                    color: colors.text,
                    marginBottom: 8,
                  }}
                  placeholder="Enter point name (e.g. lab)"
                  placeholderTextColor={colors.text}
                  value={pointName}
                  onChangeText={setPointName}
                />
                <Text style={{ color: colors.text }}>
                  Selected Coordinates: ({coords.x.toFixed(3)}, {coords.y.toFixed(3)})
                </Text>
                <WiFiFingerprintCollector
                  locationId={selectedLocation}
                  buildingId={selectedFloorplan.buildingId}
                  buildingName={selectedBuildingName || ''}
                  floorId={selectedFloorplan.floorLabel}
                  coordinates={coords}
                  description={pointName}
                  type="user_point"
                  onFingerprintCollected={() => {
                    setCoords(null);
                    setPointName('');
                    fetchPoints();
                  }}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  section: { marginVertical: 16 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  item: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
