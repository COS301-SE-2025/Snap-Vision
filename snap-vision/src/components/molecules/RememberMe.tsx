import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  rememberMe: boolean;
  onToggle: () => void;
  onForgotPassword?: () => void;
}

export default function RememberMe({ rememberMe, onToggle, onForgotPassword }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle}>
        <Text style={[styles.linkText, { color: colors.secondary }]}>
          {rememberMe ? '◉' : '◯'} Remember Me
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onForgotPassword}>
        <Text style={[styles.linkText, { color: colors.secondary }]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
