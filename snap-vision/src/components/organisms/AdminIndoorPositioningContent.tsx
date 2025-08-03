import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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

  const [buildingDropdownItems, setBuildingDropdownItems] = useState<
    { label: string; value: string }[]
  >([]);

  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  // Fetch user info and role
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

  // Load locations
  useEffect(() => {
    const fetchLocations = async () => {
      const locSnap = await firestore().collection('locations').get();
      const all = locSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));

      const filtered = role === 'editor'
        ? all.filter(loc => adminLocations.includes(loc.id))
        : all;

      setLocations(filtered);
    };
    if (role) fetchLocations();
  }, [role, adminLocations]);

  // Load buildings
  useEffect(() => {
    const fetchBuildings = async () => {
      if (!selectedLocation) return;

      const snap = await firestore()
        .collection(`locations/${selectedLocation}/buildingPOIs`)
        .get();

      const list = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
      setBuildings(list);
      setBuildingDropdownItems(list.map((b) => ({ label: b.name, value: b.id })));
      setSelectedBuildingId(null);
      setSelectedFloorplan(null);
    };
    if (selectedLocation) fetchBuildings();
  }, [selectedLocation]);

  // Load floorplans
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

  // WebView message handler
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap') {
        setCoords({ x: data.x, y: data.y });
        Alert.alert('Coordinates selected', `X: ${data.x.toFixed(3)}, Y: ${data.y.toFixed(3)}`);
      }
    } catch (err) {
      console.error('Invalid message from WebView', err);
    }
  };

  const getHTML = () => {
    return `
      <html>
        <body style="margin:0;padding:0;overflow:hidden;background:${colors.background}">
          <img id="floorplan" src="${selectedFloorplan.downloadURL}" style="width:100%;height:100%;object-fit:contain" />
          <script>
            const floorplan = document.getElementById('floorplan');
            floorplan.addEventListener('click', function(e) {
              const rect = floorplan.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', x, y }));
            });
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Positioning" />

      <ScrollView style={styles.scroll}>
        {/* Step 1: Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.primary }]}>Step 1: Select Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map(loc => (
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

        {/* Step 2: Building */}
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
                setSelectedBuildingId(val());
              }}
              searchable
              placeholder="Select a building"
              zIndex={3000}
              zIndexInverse={1000}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              dropDownContainerStyle={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Step 3: Floor */}
        {selectedBuildingId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Step 3: Select Floor</Text>
            <DropDownPicker
              open={floorDropdownOpen}
              setOpen={setFloorDropdownOpen}
              items={floorplans.map(fp => ({
                label: `Floor ${fp.floorLabel}`,
                value: fp.id,
              }))}
              value={selectedFloorplan?.id || null}
              setValue={val => {
                const match = floorplans.find(fp => fp.id === val());
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

        {/* Step 4: Floorplan View + Fingerprint Collection */}
        {selectedFloorplan && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>
              Step 4: Tap to Select Coordinates
            </Text>
            <View style={{ height: 300, marginVertical: 12 }}>
              <WebView
                ref={webViewRef}
                source={{ html: getHTML() }}
                onMessage={handleMessage}
                originWhitelist={['*']}
              />
            </View>

            {/* Only show WiFi collection if coordinates selected */}
            {coords && (
              <>
                <Text style={{ color: colors.text }}>
                  Selected Coordinates: ({coords.x.toFixed(3)}, {coords.y.toFixed(3)})
                </Text>

                <WiFiFingerprintCollector
  locationId={selectedLocation}
  buildingId={selectedFloorplan.buildingId}
  floorId={selectedFloorplan.floorLabel}
  coordinates={coords}
  description="Manual fingerprint point"
  type="corridor_point"
  onFingerprintCollected={() => setCoords(null)}
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
