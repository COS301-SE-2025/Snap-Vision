import React from 'react';
import { View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import ShopContent from '../components/organisms/ShopContent';

const ShopScreen: React.FC = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        backgroundColor={colors.background} 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ShopContent />
      </View>
    </SafeAreaView>
  );
};

export default ShopScreen;
