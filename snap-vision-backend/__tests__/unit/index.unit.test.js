jest.mock("../../src/routes/badges", () => {
  const express = require("express");
  const router = express.Router();
  router.get("/", (req, res) => res.json({ stub: true }));
  return router;
});

jest.mock("axios");

const express = require("express");
const request = require("supertest");
const axios = require("axios");

describe("index.js (unit)", () => {
  let server;

  beforeAll(() => {
    process.env.ORS_API_KEY = "test-key";

    jest.isolateModules(() => {
      server = require("../../index");
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it("GET / → 200 with running message", async () => {
    const res = await request(server).get("/");
    expect(res.status).toEqual(200);
    expect(res.text).toEqual("Snap Vision backend is running");
  });

  describe("GET /api/directions", () => {
    it("returns 400 if start or end missing", async () => {
      await request(server).get("/api/directions").expect(400, {
        error: "Missing start or end parameters",
      });
    });

    it("calls axios and returns geojson on success", async () => {
      const fakeData = { features: [] };
      axios.post.mockResolvedValue({ data: fakeData });

      const res = await request(server)
        .get("/api/directions")
        .query({ start: "10,20", end: "30,40", mode: "driving-car" })
        .expect(200);

      expect(axios.post).toHaveBeenCalledWith(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          coordinates: [
            [10, 20],
            [30, 40],
          ],
        },
        {
          headers: {
            Authorization: "test-key",
            "Content-Type": "application/json",
          },
        },
      );

      expect(res.body).toEqual(fakeData);
    });

    it("returns 500 if axios throws", async () => {
      axios.post.mockRejectedValue(new Error("network error"));

      const res = await request(server)
        .get("/api/directions")
        .query({ start: "10,20", end: "30,40" })
        .expect(500);

      expect(res.body).toEqual({ error: "Failed to fetch directions" });
    });
  });

  it("forwards /api/badges to the mocked router", async () => {
    const res = await request(server).get("/api/badges/");
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ stub: true });
  });
});
