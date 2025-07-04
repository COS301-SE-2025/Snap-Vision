const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Check if Firebase is already initialized
if (!admin.apps.length) {
  const serviceAccount = require("../serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Path to our Room POIs JSON file
const roomPoisPath = path.join(__dirname, "../pois/room_pois.json");

// Validate a room POI has all required fields
function isValidRoomPOI(poi) {
  return (
    poi.id &&
    poi.name &&
    poi.buildingId &&
    poi.floorId &&
    poi.coordinates &&
    typeof poi.coordinates.x === "number" &&
    typeof poi.coordinates.y === "number"
  );
}

// Read and parse the JSON file
fs.readFile(roomPoisPath, "utf8", async (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  try {
    const roomPois = JSON.parse(data);
    let successCount = 0;
    let skipCount = 0;

    console.log(`Processing ${roomPois.length} room POIs...`);

    for (const poi of roomPois) {
      // Skip empty objects
      if (!poi || Object.keys(poi).length === 0) {
        skipCount++;
        continue;
      }

      // Validate required fields
      if (!isValidRoomPOI(poi)) {
        console.warn(
          `Skipping invalid POI: ${poi.name || poi.id || "unknown"} - missing required fields`,
        );
        skipCount++;
        continue;
      }

      // Create a clean object with only the fields we want
      const roomPOI = {
        id: poi.id,
        name: poi.name,
        buildingId: poi.buildingId,
        floorId: poi.floorId,
        coordinates: {
          x: poi.coordinates.x,
          y: poi.coordinates.y,
        },
      };

      // Add optional fields only if they exist
      if (poi.type) roomPOI.type = poi.type;
      if (poi.description) roomPOI.description = poi.description;
      if (typeof poi.capacity === "number") roomPOI.capacity = poi.capacity;
      if (Array.isArray(poi.features)) roomPOI.features = poi.features;

      // Use the POI's id as the document ID for easier reference
      await db.collection("RoomPOIs").doc(poi.id).set(roomPOI);
      console.log(`Added: ${poi.name} (${poi.id})`);
      successCount++;
    }

    console.log("Room POIs upload complete:");
    console.log(`- ${successCount} POIs successfully uploaded`);
    console.log(`- ${skipCount} POIs skipped`);
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr);
  }
});
