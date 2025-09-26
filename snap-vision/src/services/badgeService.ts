// src/services/badgeService.ts
import firestore from '@react-native-firebase/firestore';
import { Badge } from '../types/badges';

const db = firestore();

export async function unlockBadgeForUser(userId: string, badgeId: string) {
  const POINT_INCREMENT = 50;
  const POINTS_MILESTONE = 150;
  const MILESTONE_BADGE = 'points-150';

  const userRef = db.collection('users').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        // Create new user with initial data
        transaction.set(userRef, {
          badges: [badgeId],
          points: POINT_INCREMENT,
          checkIns: 0,
          routesCompleted: 0,
        });
      } else {
        const data = userDoc.data();
        const badges = data?.badges ? [...data.badges] : [];
        let points = data?.points || 0;

        if (!badges.includes(badgeId)) {
          badges.push(badgeId);
          points += POINT_INCREMENT;
        }

        if (points >= POINTS_MILESTONE && !badges.includes(MILESTONE_BADGE)) {
          badges.push(MILESTONE_BADGE);
        }

        transaction.update(userRef, {
          badges,
          points,
        });
      }
    });
  } catch (error) {
    //consoleerror(`Error unlocking badge ${badgeId} for user ${userId}:`, error);
    throw error;
  }
}

export async function getUserBadgeData(userId: string) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return null;

  return userDoc.data();
}

export async function purchaseItemForUser(userId: string, item: any) {
  const userRef = db.collection('users').doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentPoints = userData?.points || 0;

    if (currentPoints < item.cost) {
      throw new Error('Not enough points');
    }

    const updatedPoints = currentPoints - item.cost;
    const previousPurchases = userData?.purchases || [];

    const newPurchase = {
      ...item,
      boughtAt: firestore.FieldValue.serverTimestamp(),
    };

    transaction.update(userRef, {
      points: updatedPoints,
      purchases: [...previousPurchases, newPurchase],
    });
  });

  const updatedDoc = await userRef.get();
  return updatedDoc.data();
}

export async function completeChallengeForUser(userId: string, challengeId: string) {
  const userRef = db.collection('users').doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const completedChallenges = userData?.completedChallenges || [];

    if (completedChallenges.includes(challengeId)) {
      return;
    }

    transaction.update(userRef, {
      completedChallenges: [...completedChallenges, challengeId],
      points: (userData?.points || 0) + 20,
    });
  });

  const updatedDoc = await userRef.get();
  return updatedDoc.data();
}

export async function incrementRoutesCompletedForUser(userId: string) {
  const userRef = db.collection('users').doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error('User not found');

    const data = userDoc.data();
    let routesCompleted = data?.routesCompleted || 0;
    let badges = data?.badges || [];

    routesCompleted += 1;

    const MILESTONES: Record<number, string> = {
      10: '10-destinations',
      50: '50-destinations',
      100: '100-destinations',
      150: '150-destinations',
      200: '200-destinations',
    };

    const badgeToUnlock = MILESTONES[routesCompleted];
    const newBadges = [...badges];

    if (badgeToUnlock && !badges.includes(badgeToUnlock)) {
      newBadges.push(badgeToUnlock);
    }

    transaction.update(userRef, {
      routesCompleted,
      badges: newBadges,
    });
  });

  const updatedUser = await userRef.get();
  return updatedUser.data();
}

export async function getBadges(): Promise<Record<string, Badge>> {
  // Read badges from Firestore badges collection
  const badgesRef = db.collection('badges');
  const snapshot = await badgesRef.get();
  const badges: Record<string, Badge> = {};
  snapshot.forEach((doc) => {
    const data = doc.data();
    badges[doc.id] = {
      id: doc.id as any, // Assuming doc.id matches BadgeId
      title: data.title,
      description: data.description,
    };
  });
  return badges;
}
