const request = require("supertest");
const admin   = require("firebase-admin");

let server;
const uid         = "test-user";
const badgeId     = "welcome";
const item        = { itemId: "itm1", cost: 20, name: "Sword", type: "Weapon" };
const challengeId = "ch1";

beforeAll(async () => {

  process.env.FIRESTORE_EMULATOR_HOST     = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: "snap-vision-backend" });
  }

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .set({
      points:               0,
      badges:               [],
      purchases:            [],
      completedChallenges:  [],
      routesCompleted:      0,
      checkIns:             0,
    });

  server = require("../../index");
});

afterAll(async () => {
  await server.close();

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .delete();
});

describe("Badges API routes (integration)", () => {
  it("POST /api/badges/unlock → 200 + updated data", async () => {
    const res = await request(server)
      .post("/api/badges/unlock")
      .send({ uid, badgeId })
      .expect(200);

    // Fresh user starts at 0, +50 for unlock
    expect(res.body.points).toBe(50);
    expect(res.body.badges).toContain("welcome");
  });

  it("GET /api/badges/:uid → 200 + same data", async () => {
    const res = await request(server)
      .get(`/api/badges/${uid}`)
      .expect(200);

    expect(res.body.badges).toContain("welcome");
  });

  it("POST /api/badges/purchase → 200 + new points", async () => {
    // Give user enough points (currently 50) to purchase
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({ points: 50 });

    const res = await request(server)
      .post("/api/badges/purchase")
      .send({ uid, item })
      .expect(200);

    // 50 - cost(20) = 30
    expect(res.body.points).toBe(30);
    expect(res.body.purchases.some((p) => p.itemId === "itm1")).toBe(true);
  });

  it("POST /api/badges/challenges/complete → 200 + challenge logged", async () => {
    const res = await request(server)
      .post("/api/badges/challenges/complete")
      .send({ uid, challengeId })
      .expect(200);

    expect(res.body.completedChallenges).toContain(challengeId);
  });

  it("POST /api/badges/increment-routes → 200 + clear routes count", async () => {
    // reset routesCompleted
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({ routesCompleted: 0, badges: [] });

    const res = await request(server)
      .post("/api/badges/increment-routes")
      .send({ uid })
      .expect(200);

    expect(res.body.routesCompleted).toBe(1);
  });

  it("GET non‐existent uid → 404", async () => {
    await request(server)
      .get("/api/badges/does-not-exist")
      .expect(404);
  });
});
