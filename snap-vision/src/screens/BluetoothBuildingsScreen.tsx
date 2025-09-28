import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import BluetoothBuildingsContent from '../components/organisms/BluetoothBuildingsContent';

const BluetoothBuildingsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <BluetoothBuildingsContent />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default BluetoothBuildingsScreen;
