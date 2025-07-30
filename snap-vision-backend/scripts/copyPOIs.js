const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json"); // 👈 adjust the path!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id, // 👈 this ensures project ID is explicitly set
});

const db = admin.firestore();

const migratePOIs = async () => {
  const oldCollection = db.collection("UPcampusPOIs");
  const newCollection = db.collection("locations/up-campus/buildingPOIs");

  const snapshot = await oldCollection.get();

  const batch = db.batch();
  snapshot.forEach((doc) => {
    const newDocRef = newCollection.doc(doc.id);
    batch.set(newDocRef, doc.data());
  });

  await batch.commit();
  console.log(`✅ Migrated ${snapshot.size} documents.`);
};

migratePOIs().catch(console.error);
