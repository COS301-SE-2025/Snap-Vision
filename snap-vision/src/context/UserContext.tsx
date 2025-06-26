import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type UserRole = 'admin' | 'user' | null;

const UserContext = createContext<{
  role: UserRole;
  loading: boolean;
}>({ role: null, loading: true });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        const doc = await firestore().collection('userInformation').doc(user.uid).get();
        setRole(doc.exists() ? doc.data()?.role : 'user');
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return <UserContext.Provider value={{ role, loading }}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
