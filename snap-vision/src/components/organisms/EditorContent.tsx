//Snap-Vision\snap-vision\src\components\organisms\EditorContent.tsximport React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../atoms/AppButton';

interface Props {
  colors: any;
  onLoadFloorplans: () => void;
  onEditFloorplans: () => void;
  onSettings?: () => void;
  onFloorplanEditor?: () => void;
}

export default function AdminScreenContent({
  colors,
  onLoadFloorplans,
  onEditFloorplans,
  //onSettings,
  onFloorplanEditor,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}
    testID="editor-container">
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
        Editor
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
      <View style={styles.buttonContainer}
      testID="button-container">
        <AppButton title="Load Floorplans" onPress={onLoadFloorplans} testID="button-Load-Floorplans" />
        <AppButton title="Edit Floorplans" onPress={onEditFloorplans} testID="button-Edit-Floorplans"/>
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
