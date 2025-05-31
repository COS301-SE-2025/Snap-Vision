import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AppInput({ style, ...props }: TextInputProps & { style?: any }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        { borderColor: colors.primary, color: colors.text },
        style,
      ]}
      placeholderTextColor={colors.primary}
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
