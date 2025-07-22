import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Toast from 'react-native-toast-message';
import { Colors } from 'react-native/Libraries/NewAppScreen';

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

      Toast.show({
        type: 'default',
        text1: 'Logged Out',
        text2: 'See you soon!',
        props: {
          backgroundColor: colors.card,
          borderColor: colors.primary,
          textColor: colors.primary,
          iconColor: colors.secondary,
        },
      });
    } catch (error) {
      Toast.show({
        type: 'default',
        text1: 'Logout Failed',
        text2: 'Please try again.',
        props: {
          backgroundColor: colors.card,
          borderColor: colors.primary,
          textColor: colors.primary,
          iconColor: colors.secondary,
        },
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.card }]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={styles.buttonText}>Log Out</Text>
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
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
