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
const cardWidth = width / numColumns;

export default function BadgesSection({ unlockedIds }: { unlockedIds: BadgeId[] }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state } = useBadges();
  const badges: Record<BadgeId, Badge> = state.badges;
  const badgeIds = Object.keys(badges) as BadgeId[];

const renderItem = ({ item, index }: { item: BadgeId; index: number }) => (
    <View
      style={{
        width: cardWidth,
        marginLeft: index === 0 ? 0 : 8, 
        marginRight: index === badgeIds.length - 1 ? 0 : 8, 
      }}
    >
      <RewardCard
        reward={{
          id: item,
          title: badges[item]?.title || '',
          description: badges[item]?.description || '',
          type: 'limited',
          unlockCondition: '',
          isUnlocked: unlockedIds.includes(item),
        }}
        containerStyle={{ height: 210 }}
        backgroundColor={colors.card}
        borderColor={colors.border}
      />
    </View>
  );

  return (
    <View style={styles.section}>
      <SectionHeader title="Your Badges" />
      <View style={styles.badgeContainer}>
        <FlatList
          data={badgeIds}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, alignItems: 'center' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
badgeContainer: { marginHorizontal: -20 },
});
