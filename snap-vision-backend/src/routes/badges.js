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
