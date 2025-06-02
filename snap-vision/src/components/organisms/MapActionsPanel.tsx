// src/components/organisms/MapActionsPanel.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ActionButtonWithTooltip from '../molecules/ActionButtonWithTooltip';
import { TextIcon } from '../atoms/TextIcon';

interface Props {
  currentLocation: boolean;
  onShare: () => void;
  onReport: () => void;
  shareTooltip: boolean;
  reportTooltip: boolean;
  onShareIn: () => void;
  onShareOut: () => void;
  onReportIn: () => void;
  onReportOut: () => void;
  color: string;
}

const MapActionsPanel = ({
  currentLocation,
  onShare,
  onReport,
  shareTooltip,
  reportTooltip,
  onShareIn,
  onShareOut,
  onReportIn,
  onReportOut,
  color,
}: Props) => {
  if (!currentLocation) return null;

  return (
    <View style={styles.container}>
      <ActionButtonWithTooltip
        icon={<TextIcon icon="📍" />}
        onPress={onShare}
        onPressIn={onShareIn}
        onPressOut={onShareOut}
        showTooltip={shareTooltip}
        backgroundColor={color}
        tooltipText="Share Location"
      />
      <View style={styles.spacer} />
      <ActionButtonWithTooltip
        icon={<TextIcon icon="⚠️" />}
        onPress={onReport}
        onPressIn={onReportIn}
        onPressOut={onReportOut}
        showTooltip={reportTooltip}
        backgroundColor={color}
        tooltipText="Report Crowds"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
  },
  spacer: {
    height: 15,
  },
});

export default MapActionsPanel;