import React from 'react';
import { SafeAreaView } from 'react-native';
import QRCodeAdminContent from '../components/organisms/QRCodeAdminContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function QRCodeAdminScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <QRCodeAdminContent />
    </SafeAreaView>
  );
}
