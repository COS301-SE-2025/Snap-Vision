import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function NotificationSettings() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.primary }]}>Push Notifications</Text>
        <Switch value={true} />
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.primary }]}>Email Alerts</Text>
        <Switch value={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
  },
});
