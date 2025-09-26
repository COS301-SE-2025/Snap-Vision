import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import HeaderWithIcons from '../molecules/HeaderWithIcons';
import QrCard from '../molecules/QrCard';
import AppButton from '../atoms/AppButton';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import RecentlyVisitedCarousel from '../molecules/RecentlyVisitedCarousel';
import { useEffect, useState } from 'react';
import { getRecentlyVPOIs, Visit } from '../../services/firebase/recentlyVService';
import perf from '@react-native-firebase/perf';

type RootStackParamList = {
  Map: undefined;
  // add other screens here if needed
};

export default function HomeContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [recentlyVisited, setRecentlyVisited] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const fetchRecentlyVisited = async () => {
        const trace = await perf().newTrace('recently_visited_firestore_load');
        await trace.start();
        try {
          const userId = auth().currentUser?.uid;
          if (!userId) return;

          const visits = await getRecentlyVPOIs(userId);
          setRecentlyVisited(visits);
        } catch (error) {
          //consoleerror('Error fetching recently visited:', error);
        } finally {
          setLoading(false);
          await trace.stop();
        }
      };

      fetchRecentlyVisited();
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderWithIcons />

      <View style={{ height: 20 }} />

      {/* Mascot image */}
      <View style={styles.mascotContainer}>
        <Image
          source={require('../../assets/images/mascot_ponder.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

      {/* First separator (slightly lowered) */}
      <View style={{ marginTop: 20 }}>
        <View style={[styles.separator, { borderBottomColor: colors.primary }]} />
      </View>

      {/* Go to Maps + QR Section */}
      <View style={styles.actionBlock}>
        <View style={styles.actionRow}>
          <View style={styles.mapButtonWrapper}>
            <View style={styles.mapButtonBox}>
              <AppButton title="GO TO MAPS" onPress={() => navigation.navigate('Map')} />
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
      <View style={[styles.separator, { borderBottomColor: colors.primary }]} />

      {/* Recently Visited */}
      <Text style={[styles.recentlyVisitedLabel, { color: colors.secondary }]}>
        Recently Visited
      </Text>

      {loading ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.secondary, textAlign: 'center' }}>Loading...</Text>
        </View>
      ) : (
        <RecentlyVisitedCarousel visits={recentlyVisited} testID="recently-visited-carousel" />
      )}
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
    marginTop: 10,
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
    marginTop: 20,
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
    alignItems: 'stretch',
  },
  qrWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  mascotContainer: {
    alignItems: 'center',
    marginTop: -25,
    marginBottom: -51,
    zIndex: 1,
  },
  mascotImage: {
    width: 100,
    height: 100,
  },
});
