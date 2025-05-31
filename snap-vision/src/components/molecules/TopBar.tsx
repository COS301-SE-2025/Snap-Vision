import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  title: string;
  onBackPress: () => void;
}

export default function TopBar({ title, onBackPress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Icon name="chevron-back" size={24} color="rgba(0, 0, 0, 0.70)" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  content: {
    backgroundColor: '#B78459',
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: 'black',
    fontSize: 20,
    fontWeight: '500',
  },
});