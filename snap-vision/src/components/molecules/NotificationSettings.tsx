import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function NotificationSettings() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.row, { borderBottomColor: colors.border || colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Push Notifications</Text>
        <Switch 
          value={true} 
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={isDark ? '#f4f3f4' : '#ffffff'}
          ios_backgroundColor="#3e3e3e"
          style={styles.switch}
        />
      </View>
      <View style={[styles.row, { borderBottomColor: colors.border || colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Email Alerts</Text>
        <Switch 
          value={false} 
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={isDark ? '#f4f3f4' : '#ffffff'}
          ios_backgroundColor="#3e3e3e"
          style={styles.switch}
        />
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
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
  },
  switch: {
    // Add a subtle shadow to the switch
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  }
});