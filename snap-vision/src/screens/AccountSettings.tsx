import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AccountSettingsContent from '../components/organisms/AccountSettingsContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { StackNavigationProp } from '@react-navigation/stack';

type AccountSettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

export default function AccountSettingsScreen({ navigation }: AccountSettingsScreenProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar 
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'} 
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ backgroundColor: colors.background, flexGrow: 1 }}
      >
        <AccountSettingsContent navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});