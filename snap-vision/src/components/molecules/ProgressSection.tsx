// molecules/ProgressSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProgressCard from '../atoms/ProgressCard';
import SectionHeader from '../atoms/SectionHeader';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function ProgressSection({
  points,
  badgeCount,
  checkIns,
}: {
  points: number;
  badgeCount: number;
  checkIns: number;
}) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  return (
    <View style={styles.section}>
      <SectionHeader title="Your Progress" subtitle="Keep track of your achievements" />
      <View style={[styles.progressRow, {borderColor: colors.primary}]}>
        <ProgressCard title="Points Earned" value={points} />
        <ProgressCard title="Badges Unlocked" value={badgeCount} />
        {/* <ProgressCard title="Check-ins" value={checkIns} /> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
