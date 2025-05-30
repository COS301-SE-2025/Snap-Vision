// src/components/atoms/IconButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconProps } from 'react-native-vector-icons/Icon';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  name: string;
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: any;
}

export default function IconButton({ name, size = 24, color = '#000', onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.icon, style]} onPress={onPress}>
      <Icon name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  icon: {
    padding: 4,
  },
});
