// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // ✅ Add this
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDRHL31HfdoUk53NBlWYP5C9Plz8HgisoQ",
  authDomain: "snap-vision-f6954.firebaseapp.com",
  projectId: "snap-vision-f6954",
  storageBucket: "snap-vision-f6954.appspot.com",
  messagingSenderId: "835075541618",
  appId: "1:835075541618:web:f2a2b1e4711c8b583550eb",
  measurementId: "G-1V4J5TG5PC"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
