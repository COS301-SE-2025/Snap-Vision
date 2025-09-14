// molecules/BadgesSection.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import RewardCard from '../molecules/RewardCard';
import SectionHeader from '../atoms/SectionHeader';
import { BadgeId, Badge } from '../../types/badges';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBadges } from '../../context/BadgeContext';

export default function BadgesSection({ unlockedIds }: { unlockedIds: BadgeId[] }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state } = useBadges();
  const badges: Record<BadgeId, Badge> = state.badges;

  return (
    <View style={styles.section}>
      <SectionHeader title="Your Badges" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(Object.keys(badges) as BadgeId[]).map((id) => (
          <RewardCard
            key={id}
            reward={{
              id,
              title: badges[id]?.title || '',
              description: badges[id]?.description || '',
              type: 'limited',
              unlockCondition: badges[id]?.description || '',
              isUnlocked: unlockedIds.includes(id),
            }}
            backgroundColor={colors.card}
            borderColor={colors.border}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
});
