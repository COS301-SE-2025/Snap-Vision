import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface LogoutButtonProps {
  onLogout: () => void;
  isLoading?: boolean;
}

export default function LogoutButton({ onLogout, isLoading = false }: LogoutButtonProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.danger }]} 
      onPress={onLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" size="small" testID='loading-indicator' />
      ) : (
        <Text style={styles.buttonText}>Log Out</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});