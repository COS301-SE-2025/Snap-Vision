// src/screens/AuthResolverScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function AuthResolverScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      navigation.reset({
        index: 0,
        routes: [{ name: user ? 'Tabs' : 'Login' }],
      });
    });

    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
