import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  icon: string;
  text: string;
  color: string;
}

export default function IconText({ icon, text, color }: Props) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={22} color={color} style={styles.icon} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
  },
});
