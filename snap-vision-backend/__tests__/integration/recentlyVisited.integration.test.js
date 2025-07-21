process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const admin = require("firebase-admin");
const { getRecentVisits, addVisit } = require("../../src/services/recentlyVisitedService");

beforeAll(() => {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: "snap-vision-backend",
    });
  }
});

afterAll(async () => {
  const db = admin.firestore();
  const snaps = await db.collection("recentlyVisited").listDocuments();
  await Promise.all(snaps.map((doc) => doc.delete()));
});

describe("recentlyVisitedService (integration)", () => {
  const testUser = "int-user";

  it("addVisit followed by getRecentVisits returns the new entry", async () => {
    const v1 = { userId: testUser, page: "/a" };
    const v2 = { userId: testUser, page: "/b" };
    const r1 = await addVisit(v1);
    await new Promise((r) => setTimeout(r, 10));
    const r2 = await addVisit(v2);

    const visits = await getRecentVisits(testUser);

    expect(visits.length).toBeGreaterThanOrEqual(2);
    expect(visits[0].id).toBe(r2.id);
    expect(visits[0].page).toBe("/b");
    expect(visits[1].id).toBe(r1.id);
    expect(visits[1].page).toBe("/a");
  });

  it("limit of 10 is enforced", async () => {
    for (let i = 0; i < 12; i++) {
      await addVisit({ userId: testUser, page: `/p${i}` });
    }
    const visits = await getRecentVisits(testUser);
    expect(visits).toHaveLength(10);
    expect(visits[0].page).toBe("/p11");
    expect(visits[9].page).toBe("/p2");
  });
});
