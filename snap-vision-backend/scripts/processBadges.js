const admin = require("firebase-admin");

// Adjust the path to your service account key file if needed
const serviceAccountPath = "../serviceAccountKey.json";

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error(`Failed to load service account key from ${serviceAccountPath}. Please ensure the file exists.`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const badges = {
  "first-login": {
    id: "first-login",
    title: "Welcome Aboard",
    description: "Complete your first login to the app",
  },
  "qr-scan": {
    id: "qr-scan",
    title: "QR Scanner",
    description: "Scan your first QR code",
  },
  "destination-reached": {
    id: "destination-reached",
    title: "First Steps",
    description: "Reach your first destination",
  },
  "share-location": {
    id: "share-location",
    title: "Location Sharer",
    description: "Share your location with others",
  },
  "10-destinations": {
    id: "10-destinations",
    title: "Explorer",
    description: "Reach 10 destinations",
  },
  "50-destinations": {
    id: "50-destinations",
    title: "Adventurer",
    description: "Reach 50 destinations",
  },
  "100-destinations": {
    id: "100-destinations",
    title: "Pathfinder",
    description: "Reach 100 destinations",
  },
  "150-destinations": {
    id: "150-destinations",
    title: "Trailblazer",
    description: "Reach 150 destinations",
  },
  "200-destinations": {
    id: "200-destinations",
    title: "Legend",
    description: "Reach 200 destinations",
  },
  "enabled-notifications": {
    id: "enabled-notifications",
    title: "Stay Connected",
    description: "Enable push notifications",
  },
  "reported-crowd": {
    id: "reported-crowd",
    title: "Community Helper",
    description: "Report crowd levels at locations",
  },
  "points-150": {
    id: "points-150",
    title: "Point Collector",
    description: "Earn 150 points",
  },
  "fast-finisher": {
    id: "fast-finisher",
    title: "Speed Runner",
    description: "Reach a destination within 5 minutes of starting navigation",
  },
};

async function seedBadges() {
  try {
    for (const badgeId in badges) {
      const badge = badges[badgeId];
      await db.collection("badges").doc(badgeId).set(badge);
      console.log(`Seeded badge: ${badgeId}`);
    }
    console.log("All badges seeded successfully.");
  } catch (error) {
    console.error("Error seeding badges:", error);
  }
}

seedBadges();
