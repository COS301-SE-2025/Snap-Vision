import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { resetToLogin } from '../navigation/RootNavigation';

interface UserInfo {
  email: string;
  name: string;
  role: string;
}

export async function fetchUserData(): Promise<UserInfo | null> {
  try {
    const currentUser = auth().currentUser;
    
    if (!currentUser) {
      console.log('No user is currently logged in');
      return null;
    }
    
    // Default user info from Auth
    let userInfo: UserInfo = {
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
      }
    } catch (firestoreError) {
      console.error('Error fetching from Firestore:', firestoreError);
    }
    
    return userInfo;
  } catch (error) {
    return null;
  }
}

export async function handleLogout(): Promise<boolean> {
  try {
    await auth().signOut();
    Alert.alert('Logged Out', 'You have been logged out successfully.');
    resetToLogin();
    return true;
  } catch (error) {
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: string }).message
        : 'An error occurred while logging out.';
    Alert.alert('Error Logging Out', errorMessage || 'An error occurred while logging out.');
    return false;
  }
}