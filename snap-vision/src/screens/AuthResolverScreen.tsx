// src/screens/AuthResolverScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useBadges } from '../context/BadgeContext';

export default function AuthResolverScreen() {
  const navigation = useNavigation<any>();
  const { unlock } = useBadges();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        await unlock('first-login');
      }
      navigation.reset({
        index: 0,
        routes: [{ name: user ? 'Tabs' : 'Login' }],
      });
    });

    return unsubscribe;
  }, [unlock]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
