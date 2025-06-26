import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminFloorplanEditorContent from '../components/organisms/AdminFloorplanEditorContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function AdminFloorplanEditorScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminFloorplanEditorContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
