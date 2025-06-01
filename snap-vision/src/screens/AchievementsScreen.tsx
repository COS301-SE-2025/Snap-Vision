// src/screens/AchievementsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import WelcomeHeader from '../components/molecules/WelcomeHeader';
import CategoryButton from '../components/atoms/CategoryButton';
import ChallengeItem from '../components/molecules/ChallengeItem';
import ProgressCard from '../components/atoms/ProgressCard';
import RewardCard from '../components/molecules/RewardCard';
import ActionButton from '../components/molecules/ActionButton';
import { Challenge, UserProgress, Reward, ExploreCategory } from '../types/achievements';
import TopBar from '../components/molecules/TopBar';

const AchievementsScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Mock data - replace with actual data from your store/API
  const [userProgress] = useState<UserProgress>({
    pointsEarned: 150,
    badgesUnlocked: 3,
    checkIns: 10,
  });

  const [currentChallenges] = useState<Challenge[]>([
    {
      id: '1',
      title: 'Visit 5 Lecture Halls',
      description: 'Unlock a special guide',
      isCompleted: true,
      icon: 'school',
      type: 'current',
    },
    {
      id: '2',
      title: 'Explore New Buildings',
      description: 'Unlock a badge',
      isCompleted: false,
      icon: 'business',
      type: 'current',
    },
  ]);

  const [skins] = useState<Reward[]>([
    {
      id: '1',
      title: 'Campus Explorer',
      description: 'Golden compass avatar skin',
      type: 'limited',
      unlockCondition: 'Visit 5 different lecture halls',
      isUnlocked: false,
    },
    {
      id: '2',
      title: 'Night Owl',
      description: 'Mystical owl profile frame',
      type: 'exclusive',
      unlockCondition: 'Check-in after 10 PM three times',
      isUnlocked: false,
    },
  ]);

  const [exploreCategories] = useState<ExploreCategory[]>([
    { id: '1', title: 'Shops', icon: 'storefront', color: '#FF9800' },
    { id: '2', title: 'Classes', icon: 'library', color: '#2196F3' },
    { id: '3', title: 'Parks', icon: 'leaf', color: '#4CAF50' },
  ]);

  const handleBackPress = () => {
    // Navigation back logic
    console.log('Back pressed');
  };

  const handleCategoryPress = (title: string) => {
    console.log(`${title} category pressed`);
  };

  const handleChallengePress = (challenge: Challenge) => {
    console.log(`Challenge ${challenge.title} pressed`);
  };

  const handleActionPress = (action: string) => {
    console.log(`${action} button pressed`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <TopBar title="Badges and Achievements" onBackPress={handleBackPress} />

      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <WelcomeHeader 
          userName="User"
          textColor={colors.text}
          backgroundColor={colors.card}
        />

        {/* Category Buttons */}
        <View style={styles.categoryRow}>
          <CategoryButton
            title="Achievements"
            iconName="trophy"
            backgroundColor={colors.card}
            textColor={colors.text}
            borderColor={colors.border}
            onPress={() => handleCategoryPress('Achievements')}
          />
          <CategoryButton
            title="Challenges"
            iconName="flag"
            backgroundColor={colors.card}
            textColor={colors.text}
            borderColor={colors.border}
            onPress={() => handleCategoryPress('Challenges')}
          />
          <CategoryButton
            title="Rewards"
            iconName="gift"
            backgroundColor={colors.card}
            textColor={colors.text}
            borderColor={colors.border}
            onPress={() => handleCategoryPress('Rewards')}
          />
        </View>

        {/* Current Challenges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Current Challenges
          </Text>
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

        {/* Your Progress */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Progress
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
            Keep track of your achievements
          </Text>
          <View style={styles.progressRow}>
            <ProgressCard
              title="Points Earned"
              value={userProgress.pointsEarned}
              backgroundColor={colors.card}
              textColor={colors.text}
              borderColor={colors.border}
            />
            <ProgressCard
              title="Badges Unlocked"
              value={userProgress.badgesUnlocked}
              backgroundColor={colors.card}
              textColor={colors.text}
              borderColor={colors.border}
            />
            <ProgressCard
              title="Check-ins"
              value={userProgress.checkIns}
              backgroundColor={colors.card}
              textColor={colors.text}
              borderColor={colors.border}
            />
          </View>
        </View>

        {/* Unlockable Skins */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Unlockable Skins
          </Text>
          <View style={styles.rewardsRow}>
            {skins.map((skin) => (
              <RewardCard
                key={skin.id}
                reward={skin}
                textColor={colors.text}
                backgroundColor={colors.card}
                borderColor={colors.border}
              />
            ))}
          </View>
        </View>

        {/* Explore More */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Explore More!
          </Text>
          <View style={styles.exploreRow}>
            {exploreCategories.map((category) => (
              <CategoryButton
                key={category.id}
                title={category.title}
                iconName={category.icon}
                backgroundColor={colors.card}
                textColor={colors.text}
                borderColor={colors.border}
                onPress={() => handleCategoryPress(category.title)}
              />
            ))}
          </View>
        </View>

        {/* Explore Button */}
        <View style={styles.exploreSection}>
          <Icon name="location" size={24} color={colors.text} />
          <Text style={[styles.exploreText, { color: colors.text }]}>
            Explore exciting areas
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <ActionButton
            title="View Badges"
            variant="outline"
            borderColor={colors.text}
            textColor={colors.text}
            onPress={() => handleActionPress('View Badges')}
          />
          <ActionButton
            title="Check Points"
            variant="outline"
            borderColor={colors.text}
            textColor={colors.text}
            onPress={() => handleActionPress('Check Points')}
          />
          <ActionButton
            title="Start Challenge"
            variant="primary"
            backgroundColor={colors.primary}
            textColor="#fff"
            onPress={() => handleActionPress('Start Challenge')}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
  },
  rewardsRow: {
    flexDirection: 'row',
  },
  exploreRow: {
    flexDirection: 'row',
  },
  exploreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  exploreText: {
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtons: {
    gap: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});