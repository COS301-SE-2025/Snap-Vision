// src/components/molecules/RewardCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Reward } from '../../types/achievements';

interface Props {
  reward: Reward;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;
}

export default function RewardCard({ 
  reward, 
  textColor = '#333',
  backgroundColor = '#fff',
  borderColor = '#ddd',
  onPress 
}: Props) {
  const isUnlocked = reward.isUnlocked;

  const getStatusIcon = () => {
    return isUnlocked ? 'medal-outline' : 'lock-closed-outline';
  };

  const getStatusColor = () => {
    return isUnlocked ? '#4CAF50' : '#F44336'; // green or red
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor, borderColor, opacity: isUnlocked ? 1 : 0.4 }
      ]}
      onPress={onPress}
      disabled={!isUnlocked}
    >
      <View style={[styles.tag, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.tagText}>
          {isUnlocked ? 'Unlocked' : 'Locked'}
        </Text>
      </View>
      
      <View style={styles.iconContainer}>
        <Icon name={getStatusIcon()} size={32} color={textColor} />
      </View>
      
      <Text style={[styles.title, { color: textColor }]}>
        {reward.title}
      </Text>
      
      <Text style={[styles.description, { color: textColor, opacity: 0.7 }]}>
        {reward.description}
      </Text>
      
      <Text style={[styles.condition, { color: textColor, opacity: 0.8 }]}>
        {reward.unlockCondition}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 200,
  },
  tag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  iconContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  condition: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 'auto',
  },
});
