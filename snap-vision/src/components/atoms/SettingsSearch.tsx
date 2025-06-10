import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  placeholder: string;
  onSearch: () => void;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

export default function SearchInput({ placeholder, onSearch, textColor, backgroundColor, borderColor }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={textColor}
        style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: '#A75C00' }]} onPress={onSearch}>
        <Icon name="magnify" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  button: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
  },
});
