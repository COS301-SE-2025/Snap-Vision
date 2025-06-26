// molecules/ProgressSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProgressCard from '../atoms/ProgressCard';
import SectionHeader from '../atoms/SectionHeader';

export default function ProgressSection({
  points,
  badgeCount,
  checkIns
}: {
  points: number;
  badgeCount: number;
  checkIns: number;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader 
        title="Your Progress" 
        subtitle="Keep track of your achievements" 
      />
      <View style={styles.progressRow}>
        <ProgressCard title="Points Earned" value={points} />
        <ProgressCard title="Badges Unlocked" value={badgeCount} />
        <ProgressCard title="Check-ins" value={checkIns} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  progressRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  }
});