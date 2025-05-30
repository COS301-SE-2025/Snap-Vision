// src/components/molecules/QrCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
}

export default function QrCard({ backgroundColor, titleColor, subtitleColor }: Props) {
  return (
    <View style={[styles.qrContainer, { backgroundColor }]}>
      <Icon name="camera-outline" size={20} color="#f7d85c" />
      <View style={{ marginLeft: 6 }}>
        <Text style={[styles.qrTitle, { color: titleColor }]}>Scan a nearby QR code</Text>
        <Text style={[styles.qrSubtitle, { color: subtitleColor }]}>to enable offline mode</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderColor: '#f7d85c',
    borderWidth: 1,
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  qrSubtitle: {
    fontSize: 10,
  },
});
