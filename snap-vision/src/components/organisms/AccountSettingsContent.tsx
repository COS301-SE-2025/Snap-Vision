import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import AccountDetails from '../molecules/AccountDetails';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import LogoutButton from '../molecules/LogoutButton';
import auth from '@react-native-firebase/auth';
// import { resetToLogin } from '../../navigation/RootNavigation';
import Toast from 'react-native-toast-message';
import { makeToastPayload } from '../../toastConfig';
import { resetToAuthResolver } from '../../navigation/RootNavigation';

interface Props {
  navigation: any;
}

export default function AccountSettingsContent({ navigation }: Props) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await auth().signOut();

      Toast.show(
        makeToastPayload('Logged Out', 'You have been logged out successfully.', {}, theme === 'dark'),
      );

      resetToAuthResolver();
    } catch (error) {
      Toast.show(
        makeToastPayload('Logout Failed', 'An error occurred while logging out.', {}, theme === 'dark'),
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Account Settings" />
      <AccountDetails />
      <View style={styles.logoutWrapper}>
        <LogoutButton onLogout={handleLogout} isLoading={isLoggingOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 32,
  },
  logoutWrapper: {
    marginTop: 24,
    alignItems: 'center',
  },
});
