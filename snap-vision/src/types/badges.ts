// 1. Badge ID types
export type BadgeId = 'first-login' | 'qr-scan' | 'destination-reached';

// 2. Badge shape
export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
}

// 3. Badge dictionary
export const BADGES: Record<BadgeId, Badge> = {
  'first-login': {
    id: 'first-login',
    title: 'First Login',
    description: 'You signed up for the first time!',
  },
 
};
