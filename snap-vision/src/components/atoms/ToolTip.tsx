// atoms/Tooltip.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export const Tooltip = ({ text }: { text: string }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.tooltipText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 5,
    padding: 2,
    borderWidth: 1,
    borderRadius: 6,
    maxWidth: 250,
  },
  tooltipText: {
    fontSize: 12,
  },
});
