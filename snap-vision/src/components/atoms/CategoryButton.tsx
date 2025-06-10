// src/components/atoms/CategoryButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  title: string;
  iconName: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  onPress?: () => void;
}

export default function CategoryButton({ 
  title, 
  iconName, 
  backgroundColor = '#fff',
  textColor = '#333',
  borderColor = '#ddd',
  onPress 
}: Props) {
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor, borderColor }
      ]}
      onPress={onPress}
    >
      <Icon name={iconName} size={24} color={textColor} style={styles.icon} />
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});