import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Toast from 'react-native-toast-message';
import { makeToastPayload } from '../../toastConfig';

interface LogoutButtonProps {
  onLogout: () => void;
  isLoading?: boolean;
}

export default function LogoutButton({ onLogout, isLoading = false }: LogoutButtonProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handlePress = async () => {
    try {
      await onLogout();

      Toast.show(makeToastPayload('Logged Out', 'See you soon!', {}, isDark));
    } catch (error) {
      Toast.show(makeToastPayload('Logout Failed', 'Please try again.', {}, isDark));
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.background, borderColor: colors.primary }]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={[styles.buttonText, {color: colors.primary}]}>Log Out</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
