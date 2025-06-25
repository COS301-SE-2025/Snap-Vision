// src/components/molecules/WelcomeHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  userName?: string;
}

export default function WelcomeHeader({ userName = 'User' }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.avatarContainer}>
        <Icon name="person-circle" size={40} color={colors.text} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.welcomeText, { color: colors.primary }]}>
          Welcome, {userName}!
        </Text>
        <Text style={[styles.subText, { color: colors.text, opacity: 0.7 }]}>
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
