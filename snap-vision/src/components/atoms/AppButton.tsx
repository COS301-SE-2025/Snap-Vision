import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props extends TouchableOpacityProps {
  title: string;
  testID?: string;
}

export default function AppButton({ title, testID, ...rest }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      testID={testID}
      {...rest}
    >
      <Text style={[styles.buttonText, { color: '#fff' }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
