//Snap-Vision\snap-vision\src\components\organisms\EditorContent.tsximport React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../atoms/AppButton';

interface Props {
  colors: any;
  onLoadFloorplans: () => void;
  onEditFloorplans: () => void;
  onSettings?: () => void;
  onFloorplanEditor?: () => void;
  onManageQRCodes?: () => void;
}

export default function AdminScreenContent({
  colors,
  onLoadFloorplans,
  onEditFloorplans,
  //onSettings,
  onFloorplanEditor,
  onManageQRCodes,
}: Props) {
  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="editor-container"
    >
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
        {' Editor '}
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
      <View style={styles.buttonContainer} testID="button-container">
        <AppButton
          title="Load Floorplans"
          onPress={onLoadFloorplans}
          testID="button-Load-Floorplans"
        />
        <AppButton
          title="Edit Floorplans"
          onPress={onEditFloorplans}
          testID="button-Edit-Floorplans"
        />
        <AppButton title="QR Code Admin" onPress={onManageQRCodes} testID="button-QRCode-Admin" />
        {/* <AppButton title="Settings" onPress={onSettings} /> */}
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
