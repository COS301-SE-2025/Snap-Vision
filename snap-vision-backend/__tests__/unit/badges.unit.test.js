// __tests__/unit/badges.unit.test.js

// 1) Mock firebase-admin at the top
jest.mock("firebase-admin", () => {
  const apps = [];
  const firestoreMock = jest.fn();
  firestoreMock.Timestamp  = { now: jest.fn(() => ({ seconds: 123456 })) };
  firestoreMock.FieldValue = { serverTimestamp: jest.fn(() => "SERVED_TS") };

  return {
    apps,
    initializeApp: jest.fn(),
    credential:    { cert: jest.fn() },
    firestore:     firestoreMock,
  };
});

describe("badgeService (unit)", () => {
  let admin;
  let badgeService;
  let mockDb;
  let mockTransaction;
  let mockUserRef;
  let mockUserDoc;

  beforeEach(() => {
    // a) Clear module cache
    jest.resetModules();

    // b) Re-require firebase-admin so our mock is fresh
    admin = require("firebase-admin");

    // c) Prepare the transaction and userDoc mocks
    // mockUserRef = {};
    mockUserDoc = { exists: false, data: () => ({}) };
    mockTransaction = {
      get:    jest.fn().mockResolvedValue(mockUserDoc),
      set:    jest.fn(),
      update: jest.fn(),
    };

    // d) Build mockDb
    mockUserRef = {
  get: jest.fn().mockResolvedValue(mockUserDoc),
  set: jest.fn(),
  update: jest.fn(),
};

mockDb = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn(() => mockUserRef),
  }),
  runTransaction: jest.fn((cb) => cb(mockTransaction)),
};

    // e) Stub firestore() **before** loading badgeService
    admin.firestore.mockReturnValue(mockDb);

    // f) Now load badgeService inside isolateModules to pick up our stub
    jest.isolateModules(() => {
      badgeService = require("../../src/services/badgeService");
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- unlockBadgeForUser ---
  describe("unlockBadgeForUser", () => {
    it("creates a new user doc with starting points and badge", async () => {
      mockUserDoc.exists = false;

      await badgeService.unlockBadgeForUser("u1", "first-badge");

      expect(mockDb.runTransaction).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalledWith(
        mockUserRef,
        expect.objectContaining({
          badges:         ["first-badge"],
          points:         50,
          checkIns:       0,
          routesCompleted: 0,
        })
      );
    });

    it("adds badge and increments points if user exists", async () => {
      mockUserDoc.exists = true;
      mockUserDoc.data = () => ({ badges: [], points: 20 });

      await badgeService.unlockBadgeForUser("u2", "new-badge");

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockUserRef,
        expect.objectContaining({ badges: ["new-badge"], points: 70 })
      );
    });

    it("does not duplicate badges if already unlocked", async () => {
      mockUserDoc.exists = true;
      mockUserDoc.data = () => ({ badges: ["same"], points: 50 });

      await badgeService.unlockBadgeForUser("u3", "same");

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockUserRef,
        expect.objectContaining({ badges: ["same"], points: 50 })
      );
    });
  });

  // --- getUserBadgeData ---
  it("returns data if user exists", async () => {
  // Stub the top‑level mockDb.collection() → mockUserRef.get()
  mockDb.collection = jest.fn().mockReturnValue({
    doc: () => ({
      get: () => Promise.resolve({ exists: true, data: () => ({ foo: "bar" }) })
    })
  });

  const data = await badgeService.getUserBadgeData("u4");
  expect(data).toEqual({ foo: "bar" });
});

  // --- purchaseItemForUser ---
  it("updates points and purchases when enough points", async () => {
  mockUserDoc.exists = true;
  mockUserDoc.data = () => ({ points: 100, purchases: [] });

  // Stub the post‑transaction userRef.get() for the return value
  mockUserRef.get = jest.fn().mockResolvedValue({
    data: () => ({
      points:    90,
      purchases: [{ itemId: "i3", cost: 10, boughtAt: 123456 }]
    })
  });

  const result = await badgeService.purchaseItemForUser("u7", {
    cost:   10,
    itemId: "i3",
    name:   "Test",
    type:   "T",
  });

  expect(result.points).toBe(90);
  expect(result.purchases).toHaveLength(1);
});

  // --- completeChallengeForUser ---
  it("adds new challenge and increments points", async () => {
  mockUserDoc.exists = true;
  mockUserDoc.data = () => ({ completedChallenges: [], points: 0 });

  // Stub the post‑transaction userRef.get() for the return value
  mockUserRef.get = jest.fn().mockResolvedValue({
    data: () => ({ completedChallenges: ["c2"], points: 20 })
  });

  const updated = await badgeService.completeChallengeForUser("u9", "c2");
  expect(updated.points).toBe(20);
  expect(updated.completedChallenges).toContain("c2");
});

  // --- incrementRoutesCompletedForUser ---
  it("increments routes and unlocks milestone badge", async () => {
  mockUserDoc.exists = true;
  mockUserDoc.data = () => ({ routesCompleted: 9, badges: [] });

  // Stub the post‑transaction userRef.get() for the return value
  mockUserRef.get = jest.fn().mockResolvedValue({
    data: () => ({
      routesCompleted: 10,
      badges:          ["10-destinations"]
    })
  });

  const updated = await badgeService.incrementRoutesCompletedForUser("u11");
  expect(updated.routesCompleted).toBe(10);
  expect(updated.badges).toContain("10-destinations");
});
  });

