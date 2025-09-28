import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const Divider = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: 8,
  },
});

export default Divider;
