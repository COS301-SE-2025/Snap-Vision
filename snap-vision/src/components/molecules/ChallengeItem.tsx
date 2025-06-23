// src/components/molecules/ChallengeItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Challenge } from '../../types/achievements';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  challenge: Challenge;
  onPress?: () => void;
}

export default function ChallengeItem({ challenge, onPress }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const getStatusIcon = () => {
    if (challenge.isCompleted) {
      return <Icon name="checkmark-circle" size={24} color={colors.statusActive} />;
    }
    return <Icon name={challenge.icon} size={24} color={colors.text} />;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: colors.card, borderColor: colors.border }
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {getStatusIcon()}
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.primary }]}>
          {challenge.title}
        </Text>
        <Text style={[styles.description, { color: colors.text, opacity: 0.7 }]}>
          {challenge.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
});
