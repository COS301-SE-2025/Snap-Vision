// firebase.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Connect to Firebase Emulator if running in a test environment
if (__DEV__) {
  firestore().useEmulator('127.0.0.1', 8080);
  auth().useEmulator('http://127.0.0.1:9099');
}
// No need for manual initialization — already auto-initialized via native setup

export { auth, firestore };
