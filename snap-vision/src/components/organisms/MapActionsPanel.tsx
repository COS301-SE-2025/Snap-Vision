import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import ActionButtonWithTooltip from '../molecules/ActionButtonWithTooltip';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  currentLocation: boolean;
  onShare: () => void;
  onReport: () => void;
  onAddPOI?: () => void; 
  onOpenBluetoothNavigation: () => void;
  isAdmin?: boolean;
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
  onAddPOI,
  onOpenBluetoothNavigation,
  isAdmin,
  shareTooltip,
  reportTooltip,
  onShareIn,
  onShareOut,
  onReportIn,
  onReportOut,
}: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(0));

  if (!currentLocation) return null;

  const toggleDrawer = () => {
    const toValue = isDrawerOpen ? 0 : 1;
    
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setIsDrawerOpen(!isDrawerOpen);
  };

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0], 
  });

  const arrowRotation = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Drawer Background */}
      {isDrawerOpen && (
        <Animated.View
          style={[
            styles.drawerBackground,
            {
              backgroundColor: colors.card,
              opacity: drawerAnimation,
            },
          ]}
        />
      )}

      {/* Drawer Toggle Arrow */}
      <TouchableOpacity
        style={[styles.drawerToggle, { backgroundColor: colors.primary }]}
        onPress={toggleDrawer}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Icon name="chevron-back" size={24} color={colors.background} />
        </Animated.View>
      </TouchableOpacity>

      {/* Action Buttons Drawer */}
      <Animated.View
        style={[
          styles.drawerContent,
          {
            transform: [{ translateX: drawerTranslateX }],
          },
        ]}
      >
        <ActionButtonWithTooltip
          icon={<Icon name="share-social" size={30} color={colors.background} />}
          onPress={onShare}
          onPressIn={onShareIn}
          onPressOut={onShareOut}
          showTooltip={shareTooltip}
          backgroundColor={colors.primary}
          tooltipText="Share Location"
        />

        <View style={styles.spacer} />

        <ActionButtonWithTooltip
          icon={<Icon name="people" size={30} color={colors.background} />}
          onPress={onReport}
          onPressIn={onReportIn}
          onPressOut={onReportOut}
          showTooltip={reportTooltip}
          backgroundColor={colors.primary}
          tooltipText="Report Crowds"
        />

        <View style={styles.spacer} />

        <ActionButtonWithTooltip
          icon={<MaterialIcons name="bluetooth" size={30} color={colors.background} />}
          onPress={onOpenBluetoothNavigation}
          onPressIn={() => {}}
          onPressOut={() => {}}
          showTooltip={false}
          backgroundColor={colors.primary}
          tooltipText="Bluetooth Navigation"
        />

        {/* Admin-only Add POI button */}
        {isAdmin && onAddPOI && (
          <>
            <View style={styles.spacer} />
            <ActionButtonWithTooltip
              icon={<Icon name="business" size={30} color={colors.background} />}
              onPress={onAddPOI}
              onPressIn={() => {}}
              onPressOut={() => {}}
              showTooltip={false}
              backgroundColor={colors.primary}
              tooltipText="Add Building"
            />
          </>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    right: 0, // Position flush with screen edge
    flexDirection: 'row-reverse', // Reverse to put toggle on the right
    alignItems: 'center',
    transform: [{ translateY: -25 }], // Center vertically (half of toggle button height)
  },
  drawerBackground: {
    position: 'absolute',
    top: -20, // Adjusted to cover all buttons
    right: 0,
    width: 100,
    height: 320, // Increased to cover 3-4 buttons with spacing
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  drawerToggle: {
    width: 20,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  drawerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 15, // Space between toggle and buttons
  },
  spacer: {
    height: 15,
  },
});

export default MapActionsPanel;
