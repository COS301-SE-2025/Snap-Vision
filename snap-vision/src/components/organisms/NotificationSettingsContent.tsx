import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import NotificationSettings from '../molecules/NotificationSettings';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  navigation: any;
}

export default function NotificationSettingsContent({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Notifications" />
      <NotificationSettings />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 32,
  },
});