// src/components/molecules/WelcomeHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  userName?: string;
  textColor?: string;
  backgroundColor?: string;
}

export default function WelcomeHeader({ 
  userName = 'User', 
  textColor = '#333',
  backgroundColor = '#fff'
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.avatarContainer}>
        <Icon name="person-circle" size={40} color={textColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.welcomeText, { color: textColor }]}>
          Welcome, {userName}!
        </Text>
        <Text style={[styles.subText, { color: textColor, opacity: 0.7 }]}>
          Explore and unlock achievements
        </Text>
      </View>
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
  },
  avatarContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
  },
});