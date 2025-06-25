//Snap-Vision\snap-vision\src\types\badges.ts
// 1. Badge ID types
export type BadgeId =
 // | 'first-login'  //done
  | 'qr-scan'      
  | 'destination-reached'  //done 
  | 'share-location' //done
  | '10-destinations'
  | '50-destinations'
  | '100-destinations'
  | '150-destinations'
  | '200-destinations'
  | 'enabled-notifications'
  | 'reported-crowd'   //done
  | 'points-150'   //done
  | 'fast-finisher';      



// 2. Badge shape
export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
}

// 3. Badge dictionary
export const BADGES: Record<BadgeId, Badge> = {
  // 'first-login': {
  //   id: 'first-login',
  //   title: 'First Login',
  //   description: 'You signed up for the first time!',
  // },
  'qr-scan': {
    id: 'qr-scan',
    title: 'QR Code Scanned',
    description: 'You scanned your first QR!',
  },
  'destination-reached': {
    id: 'destination-reached',
    title: 'Destination Reached',
    description: 'You arrived at your first destination!',
  },
  'share-location': {
    id: 'share-location',
    title: 'Navigator Buddy',
    description: 'Shared your location with a friend.',
  },
  '10-destinations': {
    id: '10-destinations',
    title: 'Wayfarer',
    description: 'Completed 10 destinations.',
  },
  '50-destinations': {
    id: '50-destinations',
    title: 'Pathfinder',
    description: 'Completed 50 destinations.',
  },
  '100-destinations': {
    id: '100-destinations',
    title: 'Adventurer',
    description: 'Completed 100 destinations.',
  },
  '150-destinations': {
    id: '150-destinations',
    title: 'Trail Master',
    description: 'Completed 150 destinations.',
  },
  '200-destinations': {
    id: '200-destinations',
    title: 'Legendary Explorer',
    description: 'Completed 200 destinations!',
  },
  'enabled-notifications': {
    id: 'enabled-notifications',
    title: 'Heads Up!',
    description: 'Enabled push notifications.',
  },
  'reported-crowd': {
    id: 'reported-crowd',
    title: 'Safety Watch',
    description: 'Reported a crowded area.',
  },
  'points-150': {
    id: 'points-150',
    title: 'Points Collector',
    description: 'Earned 150 points.',
  },
   'fast-finisher': {
    id: 'fast-finisher',
    title: 'Speed Runner',
    description: 'Reached your destination in under 5 minutes!',
  },

  

};

