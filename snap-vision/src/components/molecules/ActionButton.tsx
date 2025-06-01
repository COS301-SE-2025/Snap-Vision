// src/components/molecules/ActionButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

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
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: backgroundColor || '#824713',
          borderColor: backgroundColor || '#824713',
        };
      case 'secondary':
        return {
          backgroundColor: backgroundColor || '#f0f0f0',
          borderColor: borderColor || '#ddd',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: borderColor || '#824713',
        };
      default:
        return {
          backgroundColor: backgroundColor || '#824713',
          borderColor: backgroundColor || '#824713',
        };
    }
  };

  const getTextColor = () => {
    if (textColor) return textColor;
    return variant === 'primary' ? '#fff' : '#333';
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