import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminLoadFloorplansContent from '../components/organisms/AdminLoadFloorplansContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function AdminLoadFloorplansScreen() {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminLoadFloorplansContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
