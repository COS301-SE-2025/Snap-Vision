import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { Challenge } from '../../types/achievements';

type Props = {
  challenge: Challenge;
};

export default function ChallengeItem({ challenge }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const getStatusIcon = () => {
    if (challenge.isCompleted) {
      return (
        <Icon name="checkmark-circle" size={24} color={colors.statusActive || colors.primary} />
      );
    }
    return <Icon name={challenge.icon} size={24} color={colors.text} />;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: challenge.isCompleted
            ? colors.statusActive || colors.primary
            : colors.border,
          opacity: challenge.isCompleted ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.iconContainer}>{getStatusIcon()}</View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.primary }]}>{challenge.title}</Text>
        <Text style={[styles.description, { color: colors.text, opacity: 0.7 }]}>
          {challenge.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
});
