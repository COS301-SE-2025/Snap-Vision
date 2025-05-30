// src/components/molecules/HeaderWithIcons.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from '../atoms/IconButton';
import FAIcon from 'react-native-vector-icons/FontAwesome5';

interface Props {
  textColor: string;
}

export default function HeaderWithIcons({ textColor }: Props) {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: textColor }]}>GOING</Text>
      <Text style={[styles.title, { color: textColor }]}>SOMEWHERE?</Text>
      <IconButton name="notifications-outline" color="#f7d85c" style={styles.notification} />
      <FAIcon name="user-circle" size={28} color="#a6d2db" style={styles.profile} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 100,
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'cursive',
  },
  notification: {
    position: 'absolute',
    top: -60,
    right: 50,
  },
  profile: {
    position: 'absolute',
    top: -60,
    right: 10,
  },
});
