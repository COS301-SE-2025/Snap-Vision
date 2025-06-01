import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../atoms/AppButton';

interface Props {
  colors: any;
  onLoadFloorplans: () => void;
  onEditFloorplans: () => void;
  onSettings: () => void;
  onManageUsers: () => void;
}

export default function AdminScreenContent({
  colors,
  onLoadFloorplans,
  onEditFloorplans,
  onSettings,
  onManageUsers,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={{
          fontSize: 56,
          fontFamily: 'PermanentMarkerRegular',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 40,
          transform: [{ rotate: '-3deg' }],
        }}
      >
        ADMIN
      </Text>
      <Text
        style={{
          fontSize: 52,
          fontFamily: 'PermanentMarkerRegular',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 40,
          transform: [{ rotate: '-3deg' }],
        }}
      >
        DASHBOARD
      </Text>
      <View style={styles.buttonContainer}>
        <AppButton 
          title="Load Floorplans" 
          onPress={onLoadFloorplans}
        />
        <AppButton 
          title="Edit Floorplans" 
          onPress={onEditFloorplans}
        />
        <AppButton 
          title="Settings" 
          onPress={onSettings}
        />
        <AppButton 
          title="Manage Users" 
          onPress={onManageUsers}
        />
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
  }
});