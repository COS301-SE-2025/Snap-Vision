// molecules/DestinationSearch.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getThemeColors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { TextIcon } from '../atoms/TextIcon';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSearch: () => void;
}

const DestinationSearch = ({ value, onChange, onSearch }: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.text }]}>Where to?</Text>
      <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder="Search destination..."
          placeholderTextColor={isDark ? '#999' : '#666'}
        />
        <TouchableOpacity onPress={onSearch} style={[styles.button, { backgroundColor: colors.primary }]}>
          <TextIcon icon="🔍" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DestinationSearch;
