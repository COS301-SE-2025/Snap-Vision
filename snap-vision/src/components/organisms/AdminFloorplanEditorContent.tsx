import React, { RefObject } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
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
  isDarkMode?: boolean;
  isEditing?: boolean;
  deleteRoom?: () => void;
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
  goBack,
  isDarkMode = false,
  isEditing = false,
  deleteRoom,
}: AdminFloorplanEditorContentProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Room POIs - {floorLabel}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text }]}>
          Tap on the floorplan to add rooms or tap existing markers to edit
        </Text>
      </View>

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getHTML() }}
        onMessage={handleMessage}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={`
          window.isDarkMode = ${isDarkMode};
          window.themeColors = {
            background: "${colors.background}",
            text: "${colors.text}",
            border: "${colors.border}",
            primary: "${colors.primary}"
          };
          true;
        `}
      />

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomMarkers.length} rooms added
        </Text>
        <TouchableOpacity
          onPress={goBack}
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for room details */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        avoidKeyboard
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Room Details' : 'Add Room Details'}
          </Text>

          <TextInput
            placeholder="Room Name/Number"
            value={roomData.name}
            onChangeText={(text) => setRoomData({ ...roomData, name: text })}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholderTextColor={colors.secondary}
          />

          <View style={styles.typeSelector}>
            <Text style={{ color: colors.text, marginBottom: 8 }}>Room Type:</Text>
            <View style={styles.typeOptions}>
              {['classroom', 'office', 'lab', 'restroom', 'stairs', 'elevator'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setRoomData({ ...roomData, type })}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: roomData.type === type ? colors.primary : colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: roomData.type === type ? '#FFFFFF' : colors.text,
                      fontSize: 14,
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            placeholder="Description (optional)"
            value={roomData.description}
            onChangeText={(text) => setRoomData({ ...roomData, description: text })}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                minHeight: 80,
              },
            ]}
            placeholderTextColor={colors.secondary}
            multiline
          />

          <View style={styles.modalButtons}>
            {/* Show delete button when editing */}
            {isEditing && deleteRoom && (
              <TouchableOpacity onPress={deleteRoom} style={[styles.deleteButton]}>
                <Text style={{ color: '#FFFFFF' }}>Delete</Text>
              </TouchableOpacity>
            )}

            {/* Use TouchableOpacity for Cancel button */}
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={[
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  flex: isEditing ? 0.4 : 1, // Adjust flex based on whether there's a delete button
                },
              ]}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>

            {/* Use TouchableOpacity for Save button */}
            <TouchableOpacity
              onPress={saveRoomPOI}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.primary,
                  flex: isEditing ? 0.4 : 1, // Adjust flex based on whether there's a delete button
                },
              ]}
            >
              <Text style={{ color: '#FFFFFF' }}>Save</Text>
            </TouchableOpacity>
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
  },
  footerText: {
    fontSize: 16,
  },
  doneButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  saveButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    marginRight: 8,
    flex: 0.4,
  },
});
