import React, { RefObject } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import Modal from 'react-native-modal';

interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
}

interface AdminFloorplanEditorContentProps {
  colors: any;
  buildingId: string;
  floorLabel: string;
  webViewRef: RefObject<WebView>;
  getHTML: () => string;
  handleMessage: (event: { nativeEvent: { data: string } }) => void;
  roomMarkers: RoomPOI[];
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  roomData: {
    name: string;
    type: string;
    description: string;
  };
  setRoomData: (data: any) => void;
  saveRoomPOI: () => void;
  goBack: () => void;
}

export default function AdminFloorplanEditorContent({
  colors,
  floorLabel,
  webViewRef,
  getHTML,
  handleMessage,
  roomMarkers,
  isModalVisible,
  setIsModalVisible,
  roomData,
  setRoomData,
  saveRoomPOI,
  goBack
}: AdminFloorplanEditorContentProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Room POIs - {floorLabel}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text }]}>
          Tap on the floorplan to add rooms
        </Text>
      </View>
      
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getHTML() }}
        onMessage={handleMessage}
        style={styles.webview}
      />
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomMarkers.length} rooms added
        </Text>
        <AppSecondaryButton 
          title="Done" 
          onPress={goBack}
        />
      </View>
      
      {/* Modal for room details */}
      <Modal 
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        avoidKeyboard
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Room Details</Text>
          
          <TextInput
            placeholder="Room Name/Number"
            value={roomData.name}
            onChangeText={(text) => setRoomData({...roomData, name: text})}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.secondary}
          />
          
          <View style={styles.typeSelector}>
            <Text style={[{ color: colors.text }]}>Room Type:</Text>
            <View style={styles.typeOptions}>
              {['classroom', 'office', 'lab', 'restroom', 'stairs', 'elevator'].map(type => (
                <AppSecondaryButton 
                  key={type}
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                  onPress={() => setRoomData({...roomData, type})}
                  style={[
                    styles.typeOption,
                    roomData.type === type ? { backgroundColor: colors.primary } : { backgroundColor: colors.card },
                  ]}
                />
              ))}
            </View>
          </View>
          
          <TextInput
            placeholder="Description (optional)"
            value={roomData.description}
            onChangeText={(text) => setRoomData({...roomData, description: text})}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.secondary}
            multiline
          />
          
          <View style={styles.modalButtons}>
            <AppSecondaryButton 
              title="Cancel"
              onPress={() => setIsModalVisible(false)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppSecondaryButton 
              title="Save"
              onPress={saveRoomPOI}
              style={{ 
                flex: 1
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  typeOption: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
    marginRight: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  }
});