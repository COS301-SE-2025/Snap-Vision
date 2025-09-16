import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RoomPOI } from '../../hooks/useRoomManager';

interface POIPopupProps {
  visible: boolean;
  poi: RoomPOI | null;
  position?: { x: number; y: number } | null; 
  onNavigate: () => void;
  onMoreInfo: () => void;
  onClose: () => void;
  themeColors: any;
}

const POIPopup: React.FC<POIPopupProps> = ({
  visible,
  poi,
  onNavigate,
  onMoreInfo,
  onClose,
  themeColors,
}) => {
  if (!visible || !poi) return null;

  return (
    <View
      style={[
        styles.bottomSheet,
        {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="place" size={20} color={themeColors.primary} />
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
            {poi.name}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color={themeColors.secondary} />
        </TouchableOpacity>
      </View>

      {poi.type && (
        <Text style={[styles.type, { color: themeColors.secondary }]}>
          {poi.type}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: themeColors.primary }]}
          onPress={onNavigate}
        >
          <MaterialIcons name="navigation" size={18} color="white" />
          <Text style={styles.primaryButtonText}>Navigate Here</Text>
        </TouchableOpacity>

        {poi.description && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { 
              borderColor: themeColors.border,
              backgroundColor: themeColors.background 
            }]}
            onPress={onMoreInfo}
          >
            <MaterialIcons name="info-outline" size={18} color={themeColors.primary} />
            <Text style={[styles.secondaryButtonText, { color: themeColors.primary }]}>
              More Info
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  type: {
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 28, // Align with title text
  },
  closeButton: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default POIPopup;