import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AccountInfoField from '../atoms/AccountInfoField';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AccountDetails() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    email: '',
    name: '',
    role: ''
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
        
        // Default user info from Auth
        let userInfo = {
          email: currentUser.email || '',
          name: '',
          role: ''
        };
        
        // Get additional info from Firestore
        try {
          const userDoc = await firestore()
            .collection('userInformation')
            .where('email', '==', currentUser.email)
            .get();
          
          if (!userDoc.empty) {
            const firestoreData = userDoc.docs[0].data();
            userInfo = {
              ...userInfo,
              name: firestoreData.name || '',
              role: firestoreData.role || ''
            };
          } else {
            console.log('No matching document found in userInformation collection');
          }
        } catch (firestoreError) {
          console.error('Error fetching from Firestore:', firestoreError);
        }
        
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
      <AccountInfoField label="Name" value={userData.name || 'Not provided'} />
      <AccountInfoField label="Role" value={userData.role || 'Standard User'} />
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