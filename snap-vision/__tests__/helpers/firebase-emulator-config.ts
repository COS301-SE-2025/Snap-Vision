import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Connects the React Native Firebase SDK to the local emulators
 */
export function connectToEmulators() {
  // Connect Auth to the emulator
  try {
    auth().useEmulator('http://localhost:9099');
    console.log('Using Auth emulator at localhost:9099');
  } catch (error) {
    console.error('Error connecting to Auth emulator:', error);
  }

  // Connect Firestore to the emulator
  try {
    firestore().useEmulator('localhost', 8080);
    console.log('Using Firestore emulator at localhost:8080');
  } catch (error) {
    console.error('Error connecting to Firestore emulator:', error);
  }
}

/**
 * Creates a test user account in the Auth emulator
 */
export async function createTestUser(email = 'test@example.com', password = 'password123') {
  try {
    // Clear any existing sessions
    await auth().signOut().catch(() => {});
    
    // Create a new user in the emulator
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    
    // Create a user document in Firestore
    if (userCredential.user) {
      await firestore()
        .collection('userInformation')
        .doc(userCredential.user.uid)
        .set({
          email: email,
          createdAt: new Date().toISOString(), // Use simple date instead of serverTimestamp
          displayName: 'Test User',
          name: 'Test User',
          role: 'user'
        });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Cleans up test data
 */
export async function cleanupTestData(uid) {
  if (!uid) return;
  
  try {
    // Delete the user document
    await firestore()
      .collection('userInformation')
      .doc(uid)
      .delete();
      
    // Sign out
    await auth().signOut();
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}