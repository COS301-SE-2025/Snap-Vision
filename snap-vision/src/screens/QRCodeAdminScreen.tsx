import React from 'react';
import { SafeAreaView } from 'react-native';
import QRCodeAdminContent from '../components/organisms/QRCodeAdminContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function QRCodeAdminScreen() {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <QRCodeAdminContent />
    </SafeAreaView>
  );
}
