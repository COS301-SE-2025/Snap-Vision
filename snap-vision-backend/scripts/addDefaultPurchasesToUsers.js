// Script to add a default purchases array to all users in Firestore
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// The default purchase item structure
const defaultPurchase = {
  id: 'home-icon-home',
  title: 'Standard Home',
  description: 'Classic home icon for the Home tab',
  icon: 'home-outline',
  tabType: 'Home',
  cost: 0,
  equipped: true,
};

async function addDefaultPurchasesToUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  const batch = db.batch();
  snapshot.forEach(doc => {
    const userData = doc.data();
    // Only add if purchases field is missing or empty
    if (!userData.purchases || userData.purchases.length === 0) {
      const userRef = usersRef.doc(doc.id);
      batch.update(userRef, { purchases: [defaultPurchase] });
      //console.log(`Will update user ${doc.id} with default purchase.`);
    }
  });
  await batch.commit();
  //console.log('Default purchases added to users who were missing them.');
}

addDefaultPurchasesToUsers().catch(//console.error);