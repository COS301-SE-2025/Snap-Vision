import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import HeaderWithIcons from '../molecules/HeaderWithIcons';
import QrCard from '../molecules/QrCard';
import AppButton from '../atoms/AppButton';
import TimetableSection from './TimetableSection';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import RecentlyVisitedCarousel from '../molecules/RecentlyVisitedCarousel';
import { useEffect, useState } from 'react';
import { getRecentlyVPOIs, Visit } from '../../services/firebase/recentlyVService';
import perf from '@react-native-firebase/perf';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { POI } from '../../hooks/useMapPOI';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type TabParamList = {
  Home: undefined;
  Map: undefined;
  Timetable: undefined;
  Settings: undefined;
};

type MapStackParamList = {
  MapScreen: { selectedPOI?: POI };
};

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Map'>,
  StackNavigationProp<MapStackParamList>
>;

export default function HomeContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<NavigationProp>();
  const [recentlyVisited, setRecentlyVisited] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          // error intentionally ignored for UI only
        } finally {
          setLoading(false);
          await trace.stop();
        }
      };
      fetchRecentlyVisited();
    }, []),
  );
  const handleVisitPress = (visit: Visit) => {
    const poiToPass = {
      id: visit.poiId,
      name: visit.name,
      centroid: visit.centroid,
    } as POI;

    navigation.navigate('Map', {
      screen: 'MapMain',
      params: { selectedPOI: poiToPass },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      scrollEventThrottle={16}
      bounces={true}
      alwaysBounceVertical={true}
      keyboardShouldPersistTaps="handled"
    >
      <HeaderWithIcons />

      <View style={{ height: 20 }} />

      {/* Mascot image removed for test compatibility */}

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

      {/* Timetable Section */}
      <View style={styles.timetableSection}>
        <TouchableOpacity
          style={[
            styles.timetableCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => navigation.navigate('Timetable')}
          activeOpacity={0.7}
        >
          <View style={styles.timetableHeader}>
            <View style={styles.timetableIcon}>
              <Icon name="calendar-clock" size={32} color={colors.primary} />
            </View>
            <View style={styles.timetableInfo}>
              <Text style={[styles.timetableTitle, { color: colors.text }]}>My Timetable</Text>
              <Text style={[styles.timetableSubtitle, { color: colors.secondary }]}>
                View and manage your class schedule
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.secondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Third separator */}
      <View style={[styles.separator, { borderBottomColor: colors.border }]} />

      {/* Recently Visited */}
      <View style={styles.recentlyVisitedSection}>
        <Text style={[styles.recentlyVisitedLabel, { color: colors.secondary }]}>
          Recently Visited
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.carouselContainer}>
            <RecentlyVisitedCarousel visits={recentlyVisited} onVisitPress={handleVisitPress} />
          </View>
        )}
      </View>

      {/* Bottom padding for scroll */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 64,
    paddingBottom: 20,
  },
  separator: {
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  timetableSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  timetableCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timetableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timetableIcon: {
    marginRight: 16,
  },
  timetableInfo: {
    flex: 1,
  },
  timetableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timetableSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  recentlyVisitedSection: {
    minHeight: 200,
  },
  recentlyVisitedLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
  },
  carouselContainer: {
    minHeight: 120,
  },
  bottomPadding: {
    height: 40,
  },
  // Remove unused styles
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
