jest.mock("firebase-admin", () => {
  const firestoreMock = jest.fn();
  firestoreMock.FieldValue = { serverTimestamp: jest.fn(() => "MOCK_TS") };

  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: firestoreMock,
  };
});

describe("recentlyVisitedService (unit)", () => {
  let admin;
  let service;
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    jest.resetModules();
    admin = require("firebase-admin");

    mockCollection = {
      where:    jest.fn().mockReturnThis(),
      orderBy:  jest.fn().mockReturnThis(),
      limit:    jest.fn().mockReturnThis(),
      get:      jest.fn(),
      add:      jest.fn(),
    };

    mockDb = { collection: jest.fn(() => mockCollection) };
    admin.firestore.mockReturnValue(mockDb);

    service = require("../../src/services/recentlyVisitedService");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecentVisits", () => {
    it("queries with the right filters and maps docs", async () => {
      mockCollection.get.mockResolvedValueOnce({
        docs: [
          { id: "one", data: () => ({ foo: "a" }) },
          { id: "two", data: () => ({ foo: "b" }) },
        ],
      });

      const results = await service.getRecentVisits("user123");

      expect(mockDb.collection).toHaveBeenCalledWith("recentlyVisited");
      expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user123");
      expect(mockCollection.orderBy).toHaveBeenCalledWith("timestamp", "desc");
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
      expect(results).toEqual([
        { id: "one", foo: "a" },
        { id: "two", foo: "b" },
      ]);
    });
  });

  describe("addVisit", () => {
    it("adds a visit with serverTimestamp and returns new id + data", async () => {
      const fakeRef = { id: "newId" };
      mockCollection.add.mockResolvedValueOnce(fakeRef);
      const visit = { userId: "u1", page: "/home" };

      const result = await service.addVisit(visit);

      expect(mockDb.collection).toHaveBeenCalledWith("recentlyVisited");
      expect(mockCollection.add).toHaveBeenCalledWith({
        ...visit,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      expect(result).toEqual({ id: "newId", ...visit });
    });
  });
});
