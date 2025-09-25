//C:\Users\bahiy\snapvision\Snap-Vision\snap-vision\src\components\organisms\AdminContent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../atoms/AppButton';

interface Props {
  colors: any;
  onLoadFloorplans: () => void;
  onEditFloorplans: () => void;
  //onSettings: () => void;
  onManageUsers: () => void;
  onIndoorPositioning: () => void;
  onFloorplanEditor?: () => void;
  onManageQRCodes?: () => void;
}

export default function AdminScreenContent({
  colors,
  onLoadFloorplans,
  onEditFloorplans,
  //onSettings,
  onManageUsers,
  onIndoorPositioning,
  onFloorplanEditor,
  onManageQRCodes,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={{
          fontSize: 72,
          fontFamily: 'ChicleRegular',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 3,
          // transform: [{ rotate: '-3deg' }],
          textShadowColor: colors.secondary,
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 1,
        }}
      >
        {' ADMIN '}
      </Text>
      <Text
        style={{
          fontSize: 72,
          fontFamily: 'ChicleRegular',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 40,
          // transform: [{ rotate: '-3deg' }],
          textShadowColor: colors.secondary,
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 1,
        }}
      >
        {' DASHBOARD '}
      </Text>
      <View style={styles.buttonContainer}>
        <AppButton title="Load Floorplans" onPress={onLoadFloorplans} />
        <AppButton title="Edit Floorplans" onPress={onEditFloorplans} />
        <AppButton title="Indoor Positioning" onPress={onIndoorPositioning} />
        <AppButton title="Manage QR Codes" onPress={onManageQRCodes} />
        <AppButton title="Manage Users" onPress={onManageUsers} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
});
