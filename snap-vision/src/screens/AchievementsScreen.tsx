// src/screens/AchievementsScreen.tsx
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import BadgeUnlockNotifier from '../components/organisms/BadgeUnlockNotifier';
import AchievementsForm from '../components/organisms/AchievementsForm';

export default function AchievementsScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state, clearJustUnlocked } = useBadges();

  useEffect(() => {
    console.log('Unlocked badges:', Array.from(state.unlocked));
  }, [state.justUnlocked]);

  return (
    <View style={{ flex: 1 }}>
      <BadgeUnlockNotifier />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <AchievementsForm />
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
