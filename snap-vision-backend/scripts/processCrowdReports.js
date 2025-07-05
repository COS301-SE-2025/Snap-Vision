const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function addTestCrowdReport() {
  try {
    // Add a test crowd report that matches your POI structure
    const result = await db.collection("crowdReports").add({
      buildingId: "relation/7131952", // Using the same ID format as your POIs
      buildingName: "Nerina Residence", // Using the same name as in your POIs
      density: "moderate",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reportedBy: "system-test",
      centroid: {
        // Using the same structure for coordinates as your POIs
        longitude: 28.235757040714713,
        latitude: -25.75676259758456,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    console.log(`Added test crowd report with ID: ${result.id}`);
    console.log(
      "You should now see the crowdReports collection in your Firestore console",
    );

    // Add another test report with different density
    const result2 = await db.collection("crowdReports").add({
      buildingId: "relation/7131953", // A different building ID
      buildingName: "IT Building", // Another building name
      density: "crowded", // Different density level
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reportedBy: "system-test",
      centroid: {
        longitude: 28.233757, // Different coordinates
        latitude: -25.75476,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    console.log(`Added second test crowd report with ID: ${result2.id}`);
  } catch (error) {
    console.error("Error adding test crowd report:", error);
  }
}

addTestCrowdReport();
