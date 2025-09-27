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
  //onOpenBluetoothNavigation,
  isAdmin,
  shareTooltip,
  reportTooltip,
  onShareIn,
  onShareOut,
  onReportIn,
  onReportOut,
}: Props) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerAnimation] = useState(new Animated.Value(1));

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
    outputRange: [150, 0], // Increased from 80 to 150 to fully hide buttons
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

        {/* <ActionButtonWithTooltip
          icon={<MaterialIcons name="bluetooth" size={30} color={colors.background} />}
          onPress={onOpenBluetoothNavigation}
          onPressIn={() => {}}
          onPressOut={() => {}}
          showTooltip={false}
          backgroundColor={colors.primary}
          tooltipText="Bluetooth Navigation"
        /> */}
      </Animated.View>

      {/* Admin-only Add POI button - positioned below the drawer */}
      {isAdmin && onAddPOI && (
        <View style={styles.adminButtonContainer}>
          <ActionButtonWithTooltip
            icon={<Icon name="business" size={30} color={colors.background} />}
            onPress={onAddPOI}
            onPressIn={() => {}}
            onPressOut={() => {}}
            showTooltip={false}
            backgroundColor={colors.primary}
            tooltipText="Add Building"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    right: 0,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
  },
  drawerBackground: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 130,
    height: 170, // decreased from 240 in absence of bluetooth button
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  drawerToggle: {
    width: 30,
    height: 30,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
    marginRight: 10,
  },
  drawerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 15,
  },
  spacer: {
    height: 15,
  },
  adminButtonContainer: {
    position: 'absolute',
    top: 170, // decreased from 250 in absence of bluetooth button
    right: 15,
    alignItems: 'center',
  },
});

export default MapActionsPanel;
