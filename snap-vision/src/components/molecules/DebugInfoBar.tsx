import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DebugInfoBarProps {
  isRunning: boolean;
  beaconCount: number;
  hookBeaconCount: number;
  hasPosition: boolean;
  isVisible: boolean;
  currentPos?: { x: number; y: number } | null;
  themeColors: any;
}

const DebugInfoBar: React.FC<DebugInfoBarProps> = ({
  isRunning,
  beaconCount,
  hookBeaconCount,
  hasPosition,
  isVisible,
  currentPos,
  themeColors,
}) => {
  if (!__DEV__) return null;

  return (
    <View
      style={[
        styles.debugBar,
        { backgroundColor: themeColors.card, borderBottomColor: themeColors.border },
      ]}
    >
      <View style={styles.debugBarRow}>
        <Text style={[styles.debugText, { color: themeColors.text }]}>
          Scanner: {isRunning ? 'Y' : 'N'} | DB Beacons: {beaconCount} | Hook Beacons:{' '}
          {hookBeaconCount} | Position: {hasPosition ? 'Y' : 'N'} | Visible: {isVisible ? 'Y' : 'N'}
        </Text>
      </View>
      {currentPos && (
        <View style={styles.debugBarRow}>
          <Text style={[styles.debugText, { color: themeColors.secondary }]}>
            Pos: ({currentPos.x.toFixed(3)}, {currentPos.y.toFixed(3)})
          </Text>
        </View>
      )}
      <View style={styles.debugBarRow}></View>
    </View>
  );
};

const styles = StyleSheet.create({
  debugBar: { paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1 },
  debugBarRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 2 },
  debugText: { fontSize: 10, fontFamily: 'monospace' },
});

export default DebugInfoBar;
