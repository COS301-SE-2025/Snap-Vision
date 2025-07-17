// __tests__/integration/badges.integration.test.js
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const admin = require("firebase-admin");
const badgeService = require("../../src/services/badgeService");

beforeAll(() => {
  // point Admin SDK at the Firestore emulator
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

//   admin.initializeApp({
//     projectId: "snap-vision-backend",
//   });
});

afterAll(async () => {
  // cleanup: delete all user docs
  const db = admin.firestore();
  const users = await db.collection("users").listDocuments();
  const deletes = users.map((doc) => doc.delete());
  await Promise.all(deletes);
});

describe("badgeService (integration)", () => {
  const db = admin.firestore();
  const testUserId = "int-user";

  it("unlockBadgeForUser should create user in emulator", async () => {
    const before = await db.collection("users").doc(testUserId).get();
    expect(before.exists).toBe(false);

    await badgeService.unlockBadgeForUser(testUserId, "welcome");
    const after = await db.collection("users").doc(testUserId).get();
    const data = after.data();

    expect(data.points).toBe(50);
    expect(data.badges).toContain("welcome");
  });

  it("getUserBadgeData returns the correct data", async () => {
    const data = await badgeService.getUserBadgeData(testUserId);
    expect(data).toMatchObject({
      points: 50,
      badges: expect.arrayContaining(["welcome"]),
    });
  });

  it("purchaseItemForUser decrements points and records purchase", async () => {
    // give user extra points
    await db.collection("users").doc(testUserId).update({ points: 100 });

    const result = await badgeService.purchaseItemForUser(testUserId, {
      itemId: "item-1",
      cost: 30,
      name: "Sword",
      type: "Weapon",
    });

    expect(result.points).toBe(70);
    expect(result.purchases.some((p) => p.itemId === "item-1")).toBe(true);
  });

  it("completeChallengeForUser adds challenge and points", async () => {
    const before = await badgeService.getUserBadgeData(testUserId);
    const prevPoints = before.points;

    const updated = await badgeService.completeChallengeForUser(
      testUserId,
      "challenge-1"
    );
    expect(updated.points).toBe(prevPoints + 20);
    expect(updated.completedChallenges).toContain("challenge-1");
  });

  it("incrementRoutesCompletedForUser unlocks route badge", async () => {
    // simulate 9 routes
    await db
      .collection("users")
      .doc(testUserId)
      .update({ routesCompleted: 9, badges: [] });

    const updated = await badgeService.incrementRoutesCompletedForUser(
      testUserId
    );
    expect(updated.routesCompleted).toBe(10);
    expect(updated.badges).toContain("10-destinations");
  });
});
