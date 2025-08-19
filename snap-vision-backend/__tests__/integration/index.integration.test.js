jest.mock("axios");
const axios = require("axios");

// 2) Point at local emulators
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.ORS_API_KEY = "integration-key";

const request = require("supertest");
const admin = require("firebase-admin");
let server;

beforeAll(() => {
  // Initialize Admin SDK if needed
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: "snap-vision-backend" });
  }
  // Now load and start the server
  server = require("../../index");
});

afterAll(async () => {
  // Shutdown HTTP server
  await server.close();
  // Clean up Firestore
  const db = admin.firestore();
  const docs = await db.collection("recentlyVisited").listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
  const users = await db.collection("users").listDocuments();
  await Promise.all(users.map((d) => d.delete()));
});

describe("index.js (integration)", () => {
  it("GET / → 200", async () => {
    await request(server)
      .get("/")
      .expect(200, "Snap Vision backend is running");
  });

  it("GET /api/directions success → returns data", async () => {
    const sample = { features: [] };
    // Stub axios.post _before_ the request
    axios.post.mockResolvedValue({ data: sample });

    const res = await request(server)
      .get("/api/directions")
      .query({ start: "1,2", end: "3,4" })
      .expect(200);

    expect(res.body).toEqual(sample);
    // Confirm headers and payload too, if desired:
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
      {
        headers: {
          Authorization: "integration-key",
          "Content-Type": "application/json",
        },
      },
    );
  });

  it("GET /api/directions bad request → 400", async () => {
    await request(server)
      .get("/api/directions")
      .expect(400, { error: "Missing start or end parameters" });
  });

  it("GET /api/directions axios failure → 500", async () => {
    axios.post.mockRejectedValue(new Error("network error"));
    await request(server)
      .get("/api/directions")
      .query({ start: "1,2", end: "3,4" })
      .expect(500, { error: "Failed to fetch directions" });
  });
});
