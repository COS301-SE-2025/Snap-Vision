import React from 'react';
import { View, StyleSheet, Alert, SafeAreaView, ScrollView } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import AccountDetails from '../molecules/AccountDetails';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import LogoutButton from '../molecules/LogoutButton';
import auth from '@react-native-firebase/auth';

interface Props {
  navigation: any;
}

export default function AccountSettingsContent({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      Alert.alert('Logged Out', 'You have been logged out successfully.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string }).message
          : 'An error occurred while logging out.';
      Alert.alert('Error Logging Out', errorMessage || 'An error occurred while logging out.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent]}
        style={{ backgroundColor: colors.background }}
      >
        <SettingsHeader title="Account Settings" />
        <AccountDetails />
        <View style={styles.logoutWrapper}>
          <LogoutButton onLogout={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  logoutWrapper: {
    marginTop: 24,
    alignItems: 'center',
  },
});
