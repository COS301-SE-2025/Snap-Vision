import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminSettingsForm from '../components/organisms/AdminSettingsForm';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const AdminScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdminSettingsForm />
    </View>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
