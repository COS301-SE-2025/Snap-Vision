// src/components/molecules/WelcomeHeader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  userName?: string;
}

export default function WelcomeHeader(_props: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [name, setName] = useState<string>('User');

  useEffect(() => {
    let mounted = true;

    const fetchName = async () => {
      try {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        // Try to get display name from Auth first
        if (currentUser.displayName && mounted) {
          setName(currentUser.displayName);
          return;
        }

        // Fall back to Firestore userInformation by email
        const userEmail = currentUser.email;
        if (!userEmail) return;

        const userDoc = await firestore()
          .collection('userInformation')
          .where('email', '==', userEmail)
          .get();

        if (!userDoc.empty && mounted) {
          const firestoreData = userDoc.docs[0].data();
          setName(firestoreData.name || 'User');
        }
      } catch (e) {
        // ignore and keep default
      }
    };

    fetchName();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={styles.textContainerLeft}>
        <Text style={[styles.welcomeText, { color: colors.primary }]}>Welcome, {name}!</Text>
        <Text style={[styles.subText, { color: colors.text, opacity: 0.7 }]}>
          Explore and unlock achievements
        </Text>
      </View>

      <Image
        source={require('../../../assets/mascot_success.png')}
        style={styles.mascot}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginTop: 10,
    borderWidth: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  textContainerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
  },
  mascot: {
    width: 94,
    height: 94,
    marginLeft: 18,
    marginBottom: -40,
  },
});
