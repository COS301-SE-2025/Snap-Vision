// molecules/BadgesSection.tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import RewardCard from '../molecules/RewardCard';
import SectionHeader from '../atoms/SectionHeader';
import { BADGES, BadgeId } from '../../types/badges';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function BadgesSection({ unlockedIds }: { unlockedIds: BadgeId[] }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.section}>
      <SectionHeader title="Your Badges" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(Object.keys(BADGES) as BadgeId[]).map((id) => (
          <RewardCard
            key={id}
            reward={{
              id,
              title: BADGES[id].title,
              description: BADGES[id].description,
              type: 'limited',
              unlockCondition: BADGES[id].description,
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
