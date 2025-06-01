// src/types/achievements.ts
export interface Challenge {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  icon: string;
  type: 'current' | 'completed';
}

export interface UserProgress {
  pointsEarned: number;
  badgesUnlocked: number;
  checkIns: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  type: 'limited' | 'exclusive';
  unlockCondition: string;
  isUnlocked: boolean;
}

export interface ExploreCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
}