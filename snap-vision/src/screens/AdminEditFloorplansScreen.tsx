import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminEditFloorplansContent from '../components/organisms/AdminEditFloorplansContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function AdminEditFloorplansScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminEditFloorplansContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});