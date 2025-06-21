// snap-vision-backend/src/services/badgeService.js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Unlocks a badge for a user.
 * Adds the badgeId to the user's badges array if not already present,
 * and increments points by 50.
 * Creates user doc if it doesn't exist.
 * @param {string} userId - Unique user identifier
 * @param {string} badgeId - Badge ID to unlock
 */
async function unlockBadgeForUser(userId, badgeId) {
  const userRef = db.collection('users').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        // User doc does not exist - create with badge and initial points
        transaction.set(userRef, {
          badges: [badgeId],
          points: 50,
          checkIns: 0,
          routesCompleted: 0,
        });
      } else {
        const data = userDoc.data();
        const badges = data.badges || [];

        if (!badges.includes(badgeId)) {
          badges.push(badgeId);
          transaction.update(userRef, {
            badges,
            points: (data.points || 0) + 50,
          });
        } else {
          console.log(`User ${userId} already unlocked badge ${badgeId}`);
        }
      }
    });