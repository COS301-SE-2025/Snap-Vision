import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function AppInput({ style, ...props }: TextInputProps & { style?: any }) {
  const { isDark } = useTheme();

  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          borderColor: isDark ? '#824713' : '#B78459',
          color: isDark ? '#ffffff' : '#000000', 
        },
        style,
      ]}
      placeholderTextColor={isDark ? '#90AFA8' : '#3E5650'}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
  },
});
