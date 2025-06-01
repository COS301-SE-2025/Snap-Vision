import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import TopBar from '../components/molecules/TopBar';
import AchievementsForm from '../components/organisms/AchievementsForm';

const AchievementsScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handleBackPress = () => {
    // Navigation back logic
    console.log('Back pressed');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <TopBar title="Badges and Achievements" onBackPress={handleBackPress} />
      
      {/* Main Content */}
      <AchievementsForm />
    </SafeAreaView>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});