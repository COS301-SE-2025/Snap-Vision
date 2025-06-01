    import React from 'react';
    import { View, StyleSheet, Alert } from 'react-native';
    import SettingsHeader from '../molecules/SettingsHeader';
    import AccountDetails from '../molecules/AccountDetails';
    import { useTheme } from '../../theme/ThemeContext';
    import { getThemeColors } from '../../theme';
    import LogoutButton from '../molecules/LogoutButton';
    import auth from '@react-native-firebase/auth'; // Updated import

    interface Props {
    navigation: any;
    }

    export default function AccountSettingsContent({ navigation }: Props) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    const handleLogout = async () => {
        console.log('tonyyyy');
        try {
        //console.log('Attempting to log out...');
        await auth().signOut(); 
        //console.log('Logged out successfully');
        Alert.alert('Logged Out', 'You have been logged out successfully.');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
        } catch (error) {
        console.error('Error logging out:', error);
        Alert.alert('Error Logging Out', error.message || 'An error occurred while logging out.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Account Settings" />
        <AccountDetails />

        <View style={styles.logoutWrapper}>
            <LogoutButton onLogout={handleLogout} />
        </View>
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logoutWrapper: {
        marginTop: 24,
        alignItems: 'center',
    },
    });