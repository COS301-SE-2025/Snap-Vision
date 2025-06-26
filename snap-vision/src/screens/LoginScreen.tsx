import React from 'react';
import { View, StyleSheet } from 'react-native';
import LoginForm from '../components/organisms/LoginForm';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function LoginScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoginForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
