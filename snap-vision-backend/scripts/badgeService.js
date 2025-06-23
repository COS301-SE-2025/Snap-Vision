// snap-vision-backend/src/services/badgeService.js

const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();


async function unlockBadgeForUser(userId, badgeId) {
  const POINT_INCREMENT   = 50;
  const POINTS_MILESTONE  = 150;
  const MILESTONE_BADGE   = 'points-150';      

  const userRef = db.collection('users').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);


      if (!userDoc.exists) {
        const startingPoints = POINT_INCREMENT;        
        const badges = [badgeId];

        if (startingPoints >= POINTS_MILESTONE && !badges.includes(MILESTONE_BADGE)) {
          badges.push(MILESTONE_BADGE);
        }

        transaction.set(userRef, {
          badges,
          points         : startingPoints,
          checkIns       : 0,
          routesCompleted: 0,
        });
        return;
      }

  
      const data   = userDoc.data();
      const badges = data.badges ? [...data.badges] : [];
      let   points = data.points  || 0;

      if (!badges.includes(badgeId)) {
        badges.push(badgeId);
        points += POINT_INCREMENT;
      } else {
        console.log(`User ${userId} already unlocked badge ${badgeId}`);
      }

      if (points >= POINTS_MILESTONE && !badges.includes(MILESTONE_BADGE)) {
        badges.push(MILESTONE_BADGE);
      }

      transaction.update(userRef, {
        badges,
        points,
      });
    });

    console.log(`Badge ${badgeId} unlocked for user ${userId}`);
  } catch (error) {
    console.error(`Error unlocking badge ${badgeId} for user ${userId}:`, error);
    throw error;
  }
}



async function getUserBadgeData(userId) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return null;

  return userDoc.data();
}

module.exports = {
  unlockBadgeForUser,
  getUserBadgeData,
};
