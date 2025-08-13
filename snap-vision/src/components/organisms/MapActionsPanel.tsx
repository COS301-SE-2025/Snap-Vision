import React from 'react';
import { View, StyleSheet } from 'react-native';
import ActionButtonWithTooltip from '../molecules/ActionButtonWithTooltip';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  currentLocation: boolean;
  onShare: () => void;
  onReport: () => void;
  onAddPOI?: () => void; // New prop for adding POIs
  isAdmin?: boolean; // New prop to check if user is admin
  shareTooltip: boolean;
  reportTooltip: boolean;
  onShareIn: () => void;
  onShareOut: () => void;
  onReportIn: () => void;
  onReportOut: () => void;
  color: string;
  // Map rotation props
  isMapRotationEnabled?: boolean;
  onToggleMapRotation?: () => void;
}

const MapActionsPanel = ({
  currentLocation,
  onShare,
  onReport,
  onAddPOI,
  isAdmin,
  shareTooltip,
  reportTooltip,
  onShareIn,
  onShareOut,
  onReportIn,
  onReportOut,
  isMapRotationEnabled,
  onToggleMapRotation,
}: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  if (!currentLocation) return null;

  return (
    <View style={styles.container}>
      <ActionButtonWithTooltip
        icon={<Icon name="share-social" size={30} color="white" />}
        onPress={onShare}
        onPressIn={onShareIn}
        onPressOut={onShareOut}
        showTooltip={shareTooltip}
        backgroundColor={colors.primary}
        tooltipText="Share Location"
      />

      <View style={styles.spacer} />

      <ActionButtonWithTooltip
        icon={<Icon name="people" size={30} color="white" />}
        onPress={onReport}
        onPressIn={onReportIn}
        onPressOut={onReportOut}
        showTooltip={reportTooltip}
        backgroundColor={colors.primary}
        tooltipText="Report Crowds"
      />

      {/* Admin-only Add POI button */}
      {isAdmin && onAddPOI && (
        <>
          <View style={styles.spacer} />
          <ActionButtonWithTooltip
            icon={<Icon name="business" size={30} color="white" />}
            onPress={onAddPOI}
            onPressIn={() => {}}
            onPressOut={() => {}}
            showTooltip={false}
            backgroundColor={colors.primary}
            tooltipText="Add Building"
          />
        </>
      )}

      {/* Map rotation toggle button */}
      {onToggleMapRotation && (
        <>
          <View style={styles.spacer} />
          <ActionButtonWithTooltip
            icon={
              <Icon
                name={isMapRotationEnabled ? 'compass' : 'compass-outline'}
                size={30}
                color="white"
              />
            }
            onPress={onToggleMapRotation}
            onPressIn={() => {}}
            onPressOut={() => {}}
            showTooltip={false}
            backgroundColor={isMapRotationEnabled ? colors.secondary : colors.primary}
            tooltipText={isMapRotationEnabled ? 'Disable Heading-Up' : 'Enable Heading-Up'}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    flexDirection: 'column',
  },
  spacer: {
    height: 15,
  },
});

export default MapActionsPanel;
