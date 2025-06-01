// src/components/molecules/ChallengeItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Challenge } from '../../types/achievements';

interface Props {
  challenge: Challenge;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;
}

export default function ChallengeItem({ 
  challenge, 
  textColor = '#333',
  backgroundColor = '#fff',
  borderColor = '#ddd',
  onPress 
}: Props) {
  const getStatusIcon = () => {
    if (challenge.isCompleted) {
      return <Icon name="checkmark-circle" size={24} color="#4CAF50" />;
    }
    return <Icon name={challenge.icon} size={24} color={textColor} />;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor, borderColor }
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {getStatusIcon()}
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: textColor }]}>
          {challenge.title}
        </Text>
        <Text style={[styles.description, { color: textColor, opacity: 0.7 }]}>
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