const admin = require("firebase-admin");
const path = require("path");

if (!admin.apps.length) {
  const serviceAccount = require(
    path.join(__dirname, "../serviceAccountKey.json"),
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function unlockBadgeForUser(userId, badgeId) {
  const POINT_INCREMENT = 50;
  const POINTS_MILESTONE = 150;
  const MILESTONE_BADGE = "points-150";

  const userRef = db.collection("users").doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        const startingPoints = POINT_INCREMENT;
        const badges = [badgeId];

        if (
          startingPoints >= POINTS_MILESTONE &&
          !badges.includes(MILESTONE_BADGE)
        ) {
          badges.push(MILESTONE_BADGE);
        }

        transaction.set(userRef, {
          badges,
          points: startingPoints,
          checkIns: 0,
          routesCompleted: 0,
        });
        return;
      }

      const data = userDoc.data();
      const badges = data.badges ? [...data.badges] : [];
      let points = data.points || 0;

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
    console.error(
      `Error unlocking badge ${badgeId} for user ${userId}:`,
      error,
    );
    throw error;
  }
}

async function getUserBadgeData(userId) {
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return null;

  return userDoc.data();
}

module.exports = {
  unlockBadgeForUser,
  getUserBadgeData,
};

async function purchaseItemForUser(userId, item) {
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const currentPoints = userData.points || 0;

    if (currentPoints < item.cost) {
      throw new Error("Not enough points");
    }

    const updatedPoints = currentPoints - item.cost;
    const previousPurchases = userData.purchases || [];

    const newPurchase = {
      ...item,
      boughtAt: admin.firestore.Timestamp.now(),
    };

    transaction.update(userRef, {
      points: updatedPoints,
      purchases: [...previousPurchases, newPurchase],
    });
  });

  const updatedDoc = await userRef.get();
  return updatedDoc.data();
}

async function completeChallengeForUser(userId, challengeId) {
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const completedChallenges = userData.completedChallenges || [];

    if (completedChallenges.includes(challengeId)) {
      return;
    }

    completedChallenges.push(challengeId);

    let points = userData.points || 0;
    points += 20;

    transaction.update(userRef, {
      completedChallenges,
      points,
    });
  });

  const updatedDoc = await userRef.get();
  return updatedDoc.data();
}

async function incrementRoutesCompletedForUser(userId) {
  const userRef = db.collection("users").doc(userId);

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("User not found");

    const data = userDoc.data();
    let routesCompleted = data.routesCompleted || 0;
    let badges = data.badges || [];

    routesCompleted += 1;

    const MILESTONES = {
      10: "10-destinations",
      50: "50-destinations",
      100: "100-destinations",
      150: "150-destinations",
      200: "200-destinations",
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

module.exports = {
  unlockBadgeForUser,
  getUserBadgeData,
  purchaseItemForUser,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
};
