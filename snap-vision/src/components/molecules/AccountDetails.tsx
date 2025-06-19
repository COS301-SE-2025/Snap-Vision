import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AccountInfoField from '../atoms/AccountInfoField';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AccountDetails() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    email: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const currentUser = auth().currentUser;
        
        if (!currentUser) {
          console.log('No user is currently logged in');
          setLoading(false);
          return;
        }
        
        // Basic info from auth
        let userInfo = {
          email: currentUser.email || '',
        };
        
        setUserData(userInfo);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AccountInfoField label="Email Address" value={userData.email} />
      <AccountInfoField label="Password" value="••••••••••" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});