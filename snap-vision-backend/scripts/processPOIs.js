const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Path to our UP Campus POIs JSON file
const poisPath = path.join(__dirname, '../pois/UPcampus_pois.json');

// Read and parse the JSON file
fs.readFile(poisPath, 'utf8', async (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  try {
    const pois = JSON.parse(data);
    for (const poi of pois) {
      // Skip empty objects
      if (!poi || Object.keys(poi).length === 0) continue;
      await db.collection('UPcampusPOIs').add(poi);
      console.log(`Added: ${poi.name || poi.id}`);
    }
    console.log('All POIs uploaded to UPcampusPOIs collection.');
  } catch (parseErr) {
    console.error('Error parsing JSON:', parseErr);
  }
});