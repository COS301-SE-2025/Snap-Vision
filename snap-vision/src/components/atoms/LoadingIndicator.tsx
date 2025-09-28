import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface LoadingIndicatorProps {
  message?: string;
  overlay?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  overlay = false,
}) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View
      style={[
        styles.container,
        overlay && styles.overlay,
        { backgroundColor: overlay ? 'rgba(0,0,0,0.3)' : 'transparent' },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={[styles.message, { color: colors.text }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  message: {
    marginTop: 16,
    fontWeight: '500',
  },
});

export default LoadingIndicator;
