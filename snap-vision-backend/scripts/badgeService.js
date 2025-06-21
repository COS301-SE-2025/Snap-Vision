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
