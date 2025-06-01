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
  const getRewardIcon = () => {
    return reward.type === 'limited' ? 'shirt' : 'color-palette';
  };

  const getTagColor = () => {
    return reward.type === 'limited' ? '#FF9800' : '#9C27B0';
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor, borderColor }
      ]}
      onPress={onPress}
    >
      <View style={[styles.tag, { backgroundColor: getTagColor() }]}>
        <Text style={styles.tagText}>
          {reward.type === 'limited' ? 'Limited' : 'Exclusive'}
        </Text>
      </View>
      
      <View style={styles.iconContainer}>
        <Icon name={getRewardIcon()} size={32} color={textColor} />
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