import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import ThemedText from '../atoms/ThemedText';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

const Toggle = ({ value, onValueChange }: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Define text styles with proper typing
  const baseTextStyle: TextStyle = {
    position: 'absolute',
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
  };

  const onTextStyle: TextStyle = {
    ...baseTextStyle,
    color: colors.background,
    opacity: value ? 1 : 0,
  };

  const offTextStyle: TextStyle = {
    ...baseTextStyle,
    color: colors.text,
    opacity: value ? 0 : 1,
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: value ? colors.primary : colors.border,
      }]}
      onPress={() => onValueChange(!value)}
    >
      <View style={[styles.toggle, { 
        backgroundColor: colors.background,
        transform: [{ translateX: value ? 18 : 0 }],
      }]} />
      <ThemedText size="sm" style={onTextStyle}>
        On
      </ThemedText>
      <ThemedText size="sm" style={offTextStyle}>
        Off
      </ThemedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'relative',
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    zIndex: 2,
  },
});

export default Toggle;