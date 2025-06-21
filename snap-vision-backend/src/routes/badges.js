// snap-vision-backend/src/routes/badges.js
const express = require('express');
const router  = express.Router();
const {
  unlockBadgeForUser,
  getUserBadgeData,
} = require('../../scripts/badgeService');      // <── re-use your script
                                                 //      (move it to src/services/ later)
                                                 
// POST /api/badges/unlock   { uid, badgeId }
router.post('/unlock', async (req, res) => {
  const { uid, badgeId } = req.body;
  if (!uid || !badgeId)
    return res.status(400).json({ error: 'uid & badgeId required' });

  try {
    await unlockBadgeForUser(uid, badgeId);
    const data = await getUserBadgeData(uid);
    res.json(data);                               // return updated snapshot
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/badges/:uid
router.get('/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const data = await getUserBadgeData(uid);
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
