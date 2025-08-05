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
async function getRecentVisits(userId) {
  const snapshot = await db
    .collection("recentlyVisited")
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function addVisit(visit) {
  const docRef = await db.collection("recentlyVisited").add({
    ...visit,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: docRef.id, ...visit };
}

module.exports = {
  getRecentVisits,
  addVisit,
};
