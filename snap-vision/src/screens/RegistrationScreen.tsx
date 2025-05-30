import React from 'react';
import { View, StyleSheet } from 'react-native';
import RegisterForm from '../components/organisms/RegisterForm';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function RegistrationScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RegisterForm />
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
