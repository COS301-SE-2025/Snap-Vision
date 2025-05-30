// src/components/organisms/HomeContent.tsx
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import HeaderWithIcons from '../molecules/HeaderWithIcons';
import MapButton from '../molecules/MapButton';
import QrCard from '../molecules/QrCard';
import SectionTitle from '../atoms/SectionTitle';

interface Props {
  isDark: boolean;
}

export default function HomeContent({ isDark }: Props) {
  const colors = {
    background: isDark ? '#000' : '#fff',
    textPrimary: isDark ? '#69c6d0' : '#2f6e83',
    border: isDark ? '#444' : '#ddd',
    card: isDark ? '#1e1e1e' : '#f0f0f0',
    qrText: isDark ? '#f7d85c' : '#333',
    subText: isDark ? '#ccc' : '#666',
  };

  return (
    <View style={{ backgroundColor: colors.background }}>
      <HeaderWithIcons textColor={colors.textPrimary} />

      <View style={[styles.separator, { borderBottomColor: colors.border }]} />

      <View style={styles.buttonRow}>
        <MapButton />
        <QrCard
          backgroundColor={colors.card}
          titleColor={colors.qrText}
          subtitleColor={colors.subText}
        />
      </View>

      <View style={[styles.separator, { borderBottomColor: colors.border }]} />

      <SectionTitle color={colors.textPrimary}>Recently Visited</SectionTitle>

      <View style={styles.imageRow}>
        <Image source={require('../../assets/images/placeholder.jpg')} style={styles.image} />
        <Image source={require('../../assets/images/placeholder.jpg')} style={styles.image} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  separator: {
    marginTop: 20,
    borderBottomWidth: 1,
    marginVertical: 20,
    top: 60,
  },
  buttonRow: {
    top: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 100,
  },
  image: {
    width: '48%',
    height: 150,
    borderRadius: 10,
  },
});
