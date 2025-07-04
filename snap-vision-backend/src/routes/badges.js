// snap-vision-backend/src/routes/badges.js
const express = require("express");
const router = express.Router();
const {
  unlockBadgeForUser,
  getUserBadgeData,
  purchaseItemForUser,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
} = require("../../scripts/badgeService");

// POST /api/badges/unlock   { uid, badgeId }
router.post("/unlock", async (req, res) => {
  const { uid, badgeId } = req.body;
  if (!uid || !badgeId)
    return res.status(400).json({ error: "uid & badgeId required" });

  try {
    await unlockBadgeForUser(uid, badgeId);
    const data = await getUserBadgeData(uid);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/badges/:uid
router.get("/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const data = await getUserBadgeData(uid);
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/badges/purchase   { uid, item }
router.post("/purchase", async (req, res) => {
  const { uid, item } = req.body;
  if (!uid || !item)
    return res.status(400).json({ error: "uid & item required" });

  try {
    const updatedData = await purchaseItemForUser(uid, item);
    res.json(updatedData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/challenges/complete", async (req, res) => {
  const { uid, challengeId } = req.body;
  if (!uid || !challengeId)
    return res.status(400).json({ error: "uid & challengeId required" });

  try {
    const updatedData = await completeChallengeForUser(uid, challengeId);
    res.json(updatedData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/increment-routes", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  try {
    const updated = await incrementRoutesCompletedForUser(uid);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to increment routes" });
  }
});

module.exports = router;
