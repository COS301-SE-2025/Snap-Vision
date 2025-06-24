import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const connectToEmulators = () => {
  try {
    auth().useEmulator('http://localhost:9099');
    firestore().useEmulator('localhost', 2905); 
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Failed to connect to emulators:', error);
  }
};

export const createTestUser = async () => {
  try {
    const email = `test-${Date.now()}@example.com`;
    const password = 'Test123!';
    
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    
    await firestore().collection('userInformation').add({
      email,
      name: 'Test User',
      role: 'admin',
      uid
    });
    
    await auth().signInWithEmailAndPassword(email, password);
    
    return { uid, email };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

export const cleanupTestData = async (uid) => {
  try {
    // Sign out the user
    await auth().signOut();
    
    // Only attempt to delete docs if we have a uid
    if (uid) {
      // Get user documents from Firestore
      const snapshot = await firestore()
        .collection('userInformation')
        .where('uid', '==', uid)
        .get();
      
      // Make sure snapshot has docs before trying to map over them
      if (!snapshot.empty) {
        // Delete each document
        const deletePromises = snapshot.docs.map(doc => {
          // Make sure doc has a delete method
          if (doc && typeof doc.ref.delete === 'function') {
            return doc.ref.delete();
          }
          return Promise.resolve();
        });
        
        await Promise.all(deletePromises);
      }
    }
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
};