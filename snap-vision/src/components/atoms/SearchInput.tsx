// src/components/atoms/SearchInput.tsx
import React from 'react';
import { TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: () => void;
}

export default function SearchInput({ placeholder, value, onChangeText, onSearch }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#999' : '#666'}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity style={[styles.searchButton, { backgroundColor: '#824713' }]} onPress={onSearch}>
        <Icon name="search" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    padding: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
});