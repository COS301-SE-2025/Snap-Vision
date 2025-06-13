import React from 'react';
import { View, StyleSheet } from 'react-native';
import ActionButtonWithTooltip from '../molecules/ActionButtonWithTooltip';
import { TextIcon } from '../atoms/TextIcon';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

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
