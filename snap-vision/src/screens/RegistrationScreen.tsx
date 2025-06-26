import React from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import RegisterForm from '../components/organisms/RegisterForm';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function RegistrationScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerWrapper}>
          <RegisterForm />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  innerWrapper: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
