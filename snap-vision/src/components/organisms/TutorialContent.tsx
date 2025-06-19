import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import TutorialSlider from '../molecules/TutorialSlider';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation } from '@react-navigation/native';

const TutorialContent = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation();

  const handleFinish = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="How to Use SnapVision" />
      <TutorialSlider onFinish={handleFinish} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TutorialContent;