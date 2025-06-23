// src/components/forms/AchievementsForm.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import WelcomeHeader from '../molecules/WelcomeHeader';
import CategoryButton from '../atoms/CategoryButton';
import ChallengeItem from '../molecules/ChallengeItem';
import ProgressCard from '../atoms/ProgressCard';
import RewardCard from '../molecules/RewardCard';
import ActionButton from '../molecules/ActionButton';

import { useBadges } from '../../context/BadgeContext';
import { BADGES, BadgeId } from '../../types/badges';      // <- ensure BadgeId exported

/* ------------------------------------------------------------------ */
/* Hard‑coded sample data for challenges/skins — leave as is          */
/* ------------------------------------------------------------------ */
import { Challenge, Reward, ExploreCategory } from '../../types/achievements';

export default function AchievementsForm() {
  /* ───────── theme ───────── */
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  /* ───────── badge context ───────── */
  const { state, clearJustUnlocked, getChallenges } = useBadges();
  const unlockedArray = Array.from(state.unlocked);
  const currentChallenges = getChallenges();

  /* ───────── popup on unlock ───────── */
  useEffect(() => {
    if (state.justUnlocked.length) {
      const names = state.justUnlocked
        .map(id => BADGES[id].title)
        .join(', ');
      Alert.alert('🎉  Badge Unlocked!', `You earned: ${names}`, [
        { text: 'Nice!', onPress: clearJustUnlocked }
      ]);
    }
  }, [state.justUnlocked]);

  /* ───────── dummy explore data (uses theme) ───────── */
  const exploreCategories: ExploreCategory[] = [
    { id: '1', title: 'Shops',   icon: 'storefront', color: colors.secondary },
    { id: '2', title: 'Classes', icon: 'library',    color: colors.secondary },
    { id: '3', title: 'Parks',   icon: 'leaf',       color: colors.secondary },
  ];

  /* ───────── handlers ───────── */
  const handleCategoryPress  = (title: string)  => console.log(`${title} category pressed`);
  const handleChallengePress = (c: Challenge)   => console.log(`Challenge ${c.title} pressed`);
  const handleActionPress    = (a: string)      => console.log(`${a} button pressed`);

  /* ---------- UI ---------- */
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <WelcomeHeader userName="User" textColor={colors.text} backgroundColor={colors.card} />

      {/* Progress (live data) */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Keep track of your achievements</Text>
        <View style={styles.progressRow}>
          <ProgressCard title="Points Earned"    value={state.points}             backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
          <ProgressCard title="Badges Unlocked" value={state.unlocked.size}      backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
          <ProgressCard title="Check‑ins"        value={state.checkIns}           backgroundColor={colors.card} textColor={colors.text} borderColor={colors.border} />
        </View>
      </View>

      {/* Your Badges */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(Object.keys(BADGES) as BadgeId[]).map(id => {
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


      {/* Category Buttons
      <View style={styles.categoryRow}>
        {['Achievements', 'Challenges', 'Rewards'].map(title => (
          <CategoryButton
            key={title}
            title={title}
            iconName={title === 'Achievements' ? 'trophy' : title === 'Challenges' ? 'flag' : 'gift'}
            backgroundColor={colors.card}
            textColor={colors.text}
            borderColor={colors.border}
            onPress={() => handleCategoryPress(title)}
          />
        ))}
      </View> */}

      {/* Explore More
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore More!</Text>
        <View style={styles.exploreRow}>
          {exploreCategories.map(cat => (
            <CategoryButton
              key={cat.id}
              title={cat.title}
              iconName={cat.icon}
              backgroundColor={colors.card}
              textColor={colors.text}
              borderColor={colors.border}
              onPress={() => handleCategoryPress(cat.title)}
            />
          ))}
        </View>
      </View> */}

      {/* Dynamic Challenges */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Challenges</Text>
  <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
    Complete these to earn points!
  </Text>
  {currentChallenges.map((challenge) => (
    <ChallengeItem
      key={challenge.id}
      challenge={challenge}
      textColor={colors.text}
      backgroundColor={colors.card}
      borderColor={colors.border}
      onPress={() => handleChallengePress(challenge)}
    />
  ))}
</View>


      {/* Explore Banner */}
      <View style={styles.exploreSection}>
        <Icon name="location" size={24} color={colors.text} />
        <Text style={[styles.exploreText, { color: colors.text }]}>Explore exciting areas</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* <ActionButton title="View Badges"   variant="outline" borderColor={colors.text} textColor={colors.text} onPress={() => handleActionPress('View Badges')} />
        <ActionButton title="Check Points"  variant="outline" borderColor={colors.text} textColor={colors.text} onPress={() => handleActionPress('Check Points')} /> */}
        <ActionButton title="Start Challenge" variant="primary" backgroundColor={colors.primary} textColor="#fff" onPress={() => handleActionPress('Start Challenge')} />
      </View>

      

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

/* ---------- styles remain unchanged ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  categoryRow: { flexDirection: 'row', marginBottom: 24, justifyContent: 'space-between' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, opacity: 0.7, marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rewardsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  exploreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  exploreSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  exploreText: { fontSize: 16, marginLeft: 8 },
  actionButtons: { gap: 8 },
  bottomSpacing: { height: 20 },
});
