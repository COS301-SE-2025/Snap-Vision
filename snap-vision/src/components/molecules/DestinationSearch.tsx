// src/components/molecules/DestinationSearch.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { getThemeColors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { TextIcon } from '../atoms/TextIcon';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSearch: () => void;
  suggestions: any[];
  onSelectSuggestion: (feature: any) => void;
}

const DestinationSearch = ({ value, onChange, onSearch, suggestions, onSelectSuggestion }: Props) => {
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
          <Icon name="search" size={30} color="white" />
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onSelectSuggestion(item)} style={styles.suggestionItem}>
                <Text style={{ color: colors.text }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
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
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default DestinationSearch;
