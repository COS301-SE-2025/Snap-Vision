// src/components/organisms/HomeContent.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import HeaderWithIcons from '../molecules/HeaderWithIcons';
import QrCard from '../molecules/QrCard';
import AppButton from '../atoms/AppButton';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation } from '@react-navigation/native';

export default function HomeContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderWithIcons />

      <View style={{ height: 20 }} />

      {/* First separator (slightly lowered) */}
      <View style={{ marginTop: 20 }}>
        <View style={[styles.separator, { borderBottomColor: colors.border }]} />
      </View>

      {/* Go to Maps + QR Section */}
      <View style={styles.actionBlock}>
        <View style={styles.actionRow}>
          <View style={styles.mapButtonWrapper}>
            <View style={styles.mapButtonBox}>
              <AppButton
                title="GO TO MAPS"
                onPress={() => navigation.navigate('Map')}
                color={colors.primary}
              />
            </View>
          </View>

          <View style={styles.qrWrapper}>
            <QrCard
              backgroundColor={isDark ? '#1e1e1e' : '#f9f9f9'}
              titleColor={colors.primary}
              subtitleColor={colors.secondary}
            />
          </View>
        </View>
      </View>

      {/* Second separator */}
      <View style={[styles.separator, { borderBottomColor: colors.border }]} />

      {/* Recently Visited */}
      <Text style={[styles.recentlyVisitedLabel, { color: colors.secondary }]}>
        Recently Visited
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageRow}
      >
        <Image source={require('../../assets/images/placeholder.jpg')} style={styles.image} />
        <Image source={require('../../assets/images/placeholder.jpg')} style={styles.image} />
        <Image source={require('../../assets/images/placeholder.jpg')} style={styles.image} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
  },
  separator: {
    borderBottomWidth: 1,
    marginVertical: 20,
  },
  recentlyVisitedLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 40,
  },
  imageRow: {
    paddingHorizontal: 20,
    gap: 16,
  },
  image: {
    width: 140,
    height: 160,
    borderRadius: 10,
  },
  actionBlock: {
    marginTop: 20, // was 40, now slightly higher
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  mapButtonWrapper: {
    flex: 1.1,
    marginRight: 8,
  },
 mapButtonBox: {
  justifyContent: 'center',
  alignItems: 'stretch', // optional for button alignment
},

  qrWrapper: {
    flex: 1,
    marginLeft: 8,
  },
});
