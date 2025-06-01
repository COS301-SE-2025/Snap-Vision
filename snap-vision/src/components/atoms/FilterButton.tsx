// src/components/atoms/FilterButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  title: string;
  iconName: string;
  isSelected: boolean;
  onPress: () => void;
}

export default function FilterButton({ title, iconName, isSelected, onPress }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isSelected ? '#824713' : colors.card,
          borderColor: isSelected ? '#824713' : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Icon
        name={iconName}
        size={20}
        color={isSelected ? '#fff' : colors.text}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          { color: isSelected ? '#fff' : colors.text },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});