import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import StandardPopup from '../atoms/StandardPopup';
import Icon from 'react-native-vector-icons/Ionicons';
import QRScanner from './QRScanner';
import { getQRCodeMappingByValue } from '../../services/qrService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';
import { useBadges } from '../../context/BadgeContext';

interface Props {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
}

// Adjust these to match your real navigator params
type RootStackParamList = {
  IndoorSchematicNav: {
    locationId: string; // real location (e.g., "up-campus")
    buildingId: string; // building to open
    buildingName: string; // for UI
    floorId: string; // floor to show
    userPos?: { x: number; y: number } | null; // optional user position
  };
};

// Room POI interface matching the structure in IndoorSchematicNavScreen
interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
}

export default function QrCard({ backgroundColor, titleColor, subtitleColor }: Props) {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { unlock } = useBadges();

  // Popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleQRScan = async (qrValue: string) => {
    setProcessing(true);
    setScannerVisible(false);
    setError(null);

    try {
      if (!qrValue || typeof qrValue !== 'string' || qrValue.trim() === '') {
        setError('Empty or invalid QR code data.');
        setErrorMessage('The QR code data is empty or invalid.');
        setShowErrorPopup(true);
        return;
      }

      //consolelog('Processing QR code value:', qrValue);

      const qrMapping = await getQRCodeMappingByValue(qrValue);

      if (!qrMapping) {
        setError('Invalid QR code. Please try again.');
        setErrorMessage('No mapping exists for this QR code.');
        setShowErrorPopup(true);
        return;
      }

      //consolelog('QR mapping found:', JSON.stringify(qrMapping));

      // Unlock the QR scan badge for successful scan
      try {
        await unlock('qr-scan');
      } catch (badgeError) {
        // Don't fail the whole operation if badge unlock fails
        console.warn('Failed to unlock qr-scan badge:', badgeError);
      }

      // Use the mapping as saved by createQRCodeMapping
      const { locationId, buildingId, buildingName, roomId, floorId } = qrMapping;

      if (!locationId || !buildingId || !roomId || !floorId) {
        setError('QR code is incomplete. Please try another one.');
        return;
      }

      // Add a guaranteed fallback coordinate - this ensures we always have a userPos
      const fallbackCoordinates = { x: 500, y: 500 };

      // Navigate without trying to get room details if something is missing
      if (!locationId || !buildingId || !roomId) {
        //consolewarn('Missing required data for room lookup', { locationId, buildingId, roomId });
        navigation.navigate('IndoorSchematicNav', {
          locationId,
          buildingId,
          buildingName: buildingName || 'Building',
          floorId,
          userPos: fallbackCoordinates, // Always include fallback coordinates
        });
        return;
      }

      // Get room details to access coordinates for userPos
      try {
        // Log the exact path we're accessing to debug
        const dbPath = `locations/${locationId}/roomPOIs/${roomId}`;
        //consolelog('Accessing Firestore path:', dbPath);

        // Try using collection group query which searches across all collections named 'roomPOIs'
        //consolelog('Trying collection group query for roomId:', roomId);

        try {
          // Try querying by name from QR mapping
          const groupQuery = await firestore()
            .collectionGroup('roomPOIs')
            .where('name', '==', qrMapping.roomName)
            .limit(1)
            .get();

          if (!groupQuery.empty) {
            const roomDoc = groupQuery.docs[0];
            //consolelog('Found room via collection group query:', roomDoc.id);
            const roomData = roomDoc.data();
            //consolelog('Room data via collection group:', JSON.stringify(roomData));

            // If found via collection group, process this data and continue
            if (roomData && (roomData.coordinates || roomData.position)) {
              const coordinates = roomData.coordinates || roomData.position;
              //consolelog('Room coordinates found via collection group:', coordinates);

              // Navigate with all needed params including userPos
              navigation.navigate('IndoorSchematicNav', {
                locationId,
                buildingId,
                buildingName: buildingName || 'Building',
                floorId,
                userPos: coordinates,
              });
              return;
            }
          }
        } catch (groupError) {
          //consolewarn('Error in collection group query:', groupError);
        }

        // Regular direct document access as fallback
        const roomRef = firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .doc(roomId);

        //consolelog('Fetching room data for:', roomId, 'in location:', locationId);
        const roomDoc = await roomRef.get();

        // In newer Firebase versions, exists is a property or function
        let docExists = false;
        if (typeof roomDoc.exists === 'function') {
          docExists = roomDoc.exists();
          //consolelog('Room exists (from function):', docExists, 'Room ID:', roomDoc.id);
        } else {
          docExists = !!roomDoc.exists;
          //consolelog('Room exists (from property):', docExists, 'Room ID:', roomDoc.id);
        }

        if (!docExists) {
          //consolewarn('Room document not found:', roomId);
          // Navigate WITH fallback coordinates even when room not found
          navigation.navigate('IndoorSchematicNav', {
            locationId,
            buildingId,
            buildingName: buildingName || 'Building',
            floorId,
            userPos: fallbackCoordinates, // Use the fallback coordinates
          });
          return;
        }

        // Room document exists, try to get coordinates
        const roomData = roomDoc.data() as any;
        // Log the actual room data for debugging
        //consolelog('Room data retrieved:', roomData ? JSON.stringify(roomData) : 'undefined');
        //consolelog('Type of roomData:', roomData ? typeof roomData : 'undefined');

        // Pre-define coordinates as fallback to guarantee we always have something
        let coordinates = fallbackCoordinates;

        // Some room documents store position as 'position' instead of 'coordinates'
        // Check for both fields
        if (!roomData) {
          //consolewarn('Room data is null or undefined for room:', roomId);
          navigation.navigate('IndoorSchematicNav', {
            locationId,
            buildingId,
            buildingName: buildingName || 'Building',
            floorId,
            userPos: fallbackCoordinates, // Use the fallback coordinates
          });
          return;
        }

        // Check for coordinates or position field
        // let coordinates = null;
        if (roomData.coordinates) {
          coordinates = roomData.coordinates;
          //consolelog('Room coordinates found:', coordinates);
        } else if (roomData.position) {
          coordinates = roomData.position;
          //consolelog('Room position found:', coordinates);
        } else {
          //consolewarn('No coordinates or position found for room:', roomId);

          // FALLBACK: Always use hardcoded coordinates when room data is missing
          // This is a reliable workaround for demo/testing purposes
          //consolelog('Using fallback coordinates for QR code room');

          // Always use simple coordinates for any building/floor
          coordinates = fallbackCoordinates; // Use the same fallback coordinates defined above
          //consolelog('Using fallback coordinates:', coordinates);
        }

        // Navigate with all needed params including userPos from room coordinates
        navigation.navigate('IndoorSchematicNav', {
          locationId,
          buildingId,
          buildingName: buildingName || 'Building',
          floorId,
          userPos: coordinates, // Set starting position from room coordinates
        });
      } catch (roomError) {
        //consoleerror('Error fetching room data:', roomError);
        // Continue navigation without coordinates
        navigation.navigate('IndoorSchematicNav', {
          locationId,
          buildingId,
          buildingName: buildingName || 'Building',
          floorId,
        });
        return;
      }
    } catch (err) {
      //consoleerror('Error processing QR code:', err);
      setError('Error processing QR code. Please try again.');
      setErrorMessage('Something went wrong while processing the code.');
      setShowErrorPopup(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="QR Code Error"
        message={errorMessage}
        onConfirm={() => setShowErrorPopup(false)}
      />

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

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
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