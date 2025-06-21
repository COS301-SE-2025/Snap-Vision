// src/screens/AchievementsScreen.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { BADGES, BadgeId } from '../types/badges';

import WelcomeHeader from '../components/molecules/WelcomeHeader';
import ProgressCard from '../components/atoms/ProgressCard';
import RewardCard from '../components/molecules/RewardCard';
import BadgeUnlockNotifier from '../components/organisms/BadgeUnlockNotifier';
import { BadgeProvider } from '../context/BadgeContext';

export default function AchievementsScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state, clearJustUnlocked } = useBadges();
  const unlockedArray = Array.from(state.unlocked);

  useEffect(() => {
    console.log('Unlocked badges:', Array.from(state.unlocked));

  }, [state.justUnlocked]);

  return (
    <View style={{ flex: 1 }}>
    
    <BadgeUnlockNotifier />
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <WelcomeHeader
        userName="User"
        textColor={colors.text}
        backgroundColor={colors.card}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Keep track of your achievements</Text>
        <View style={styles.progressRow}>
          <ProgressCard title="Points Earned" value={state.points} backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
          <ProgressCard title="Badges Unlocked" value={state.unlocked.size} backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
          <ProgressCard title="Check-ins" value={state.checkIns} backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(Object.keys(BADGES) as BadgeId[]).map((id) => {
            const badge = BADGES[id];
            return (
              <RewardCard
                key={id}
                reward={{
                  id,
                  title: badge.title,
                  description: badge.description,
                  type: 'limited',
                  unlockCondition: '',
                  isUnlocked: unlockedArray.includes(id),
                }}
                textColor={unlockedArray.includes(id) ? colors.text : colors.subtleText}
                backgroundColor={colors.card}
                borderColor={colors.border}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, opacity: 0.7, marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bottomSpacing: { height: 20 },
});
