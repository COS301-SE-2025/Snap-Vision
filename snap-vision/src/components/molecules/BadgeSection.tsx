// molecules/BadgesSection.tsx
import React from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';
import RewardCard from '../molecules/RewardCard';
import SectionHeader from '../atoms/SectionHeader';
import { BadgeId, Badge } from '../../types/badges';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBadges } from '../../context/BadgeContext';

const { width } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 48) / numColumns; // increased padding and gap to reduce card width

export default function BadgesSection({ unlockedIds }: { unlockedIds: BadgeId[] }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state } = useBadges();
  const badges: Record<BadgeId, Badge> = state.badges;
  const badgeIds = Object.keys(badges) as BadgeId[];

  const renderItem = ({ item }: { item: BadgeId }) => (
    <View style={styles.cardContainer}>
      <RewardCard
        reward={{
          id: item,
          title: badges[item]?.title || '',
          description: badges[item]?.description || '',
          type: 'limited',
          unlockCondition: badges[item]?.description || '',
          isUnlocked: unlockedIds.includes(item),
        }}
        backgroundColor={colors.card}
        borderColor={colors.border}
      />
    </View>
  );

  return (
    <View style={styles.section}>
      <SectionHeader title="Your Badges" />
      <FlatList
        data={badgeIds}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  grid: { paddingHorizontal: 16 },
  cardContainer: { width: cardWidth, margin: 8 },
});
