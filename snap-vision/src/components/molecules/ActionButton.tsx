// src/components/molecules/ActionButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  title: string;
  onPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function ActionButton({ 
  title, 
  onPress,
  backgroundColor,
  textColor,
  borderColor,
  variant = 'primary'
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: backgroundColor || colors.primary,
          borderColor: borderColor || colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: backgroundColor || colors.card,
          borderColor: borderColor || colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: borderColor || colors.primary,
        };
      default:
        return {
          backgroundColor: backgroundColor || colors.primary,
          borderColor: borderColor || colors.primary,
        };
    }
  };

  const getTextColor = () => {
    if (textColor) return textColor;
    if (variant === 'primary') return '#fff';
    // For secondary and outline, use theme text color
    return colors.text;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        getButtonStyle()
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
