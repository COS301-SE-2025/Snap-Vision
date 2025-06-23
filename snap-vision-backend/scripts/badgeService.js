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
/**
 * Unlocks a badge for a user.
 * ─ Adds the given badgeId (if not already present)
 * ─ Increments points by 50 each time a NEW badge is added
 * ─ Automatically unlocks the "points-150" badge once the user reaches ≥150 pts
 * ─ Creates the user doc if it doesn't exist
 *
 * @param {string} userId  Unique user identifier
 * @param {string} badgeId Badge ID to unlock
 */
async function unlockBadgeForUser(userId, badgeId) {
  const POINT_INCREMENT   = 50;
  const POINTS_MILESTONE  = 150;
  const MILESTONE_BADGE   = 'points-150';       // <── make sure this exists in BADGES

  const userRef = db.collection('users').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      /* ───────────────────────────────
       * 1️⃣  CREATE user doc if missing
       * ─────────────────────────────── */
      if (!userDoc.exists) {
        const startingPoints = POINT_INCREMENT;         // first badge = +50 pts
        const badges = [badgeId];

        // milestone check on very first badge
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

      /* ───────────────────────────────
       * 2️⃣  UPDATE existing user doc
       * ─────────────────────────────── */
      const data   = userDoc.data();
      const badges = data.badges ? [...data.badges] : [];
      let   points = data.points  || 0;

      // a) add requested badge & points
      if (!badges.includes(badgeId)) {
        badges.push(badgeId);
        points += POINT_INCREMENT;
      } else {
        console.log(`User ${userId} already unlocked badge ${badgeId}`);
      }

      // b) milestone badge check (after possible increment)
      if (points >= POINTS_MILESTONE && !badges.includes(MILESTONE_BADGE)) {
        badges.push(MILESTONE_BADGE);
      }

      // c) write back
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


/**
 * Fetches badge data and stats for a user.
 * @param {string} userId - Unique user identifier
 * @returns {Promise<Object|null>} - User badge data or null if user not found
 */
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
