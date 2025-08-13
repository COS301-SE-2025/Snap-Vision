// src/api/badgeApi.ts
import { BadgeId } from '../types/badges';
// import { BADGE_API_BASE } from '@env';

// Android emulator uses 10.0.2.2 to access localhost on your PC
const BASE = 'http://192.168.43.155:3000/api/badges';

export async function fetchBadgeSnapshot(uid: string) {
  const res = await fetch(`${BASE}/${uid}`);
  if (!res.ok) throw new Error('Unable to fetch badge data');
  return res.json();
}

export async function unlockBadge(uid: string, badgeId: BadgeId) {
  const res = await fetch(`${BASE}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, badgeId }),
  });
  if (!res.ok) throw new Error('Unable to unlock badge');
  return res.json();
}

interface PurchaseItem {
  itemId: string;
  name: string;
  type: string;
  cost: number;
}

export async function purchaseItem(uid: string, item: PurchaseItem) {
  const res = await fetch(`${BASE}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, item }),
  });
  if (!res.ok) throw new Error('Unable to purchase item');
  return res.json(); // Updated user data
}

export async function completeChallenge(uid: string, challengeId: string) {
  const res = await fetch(`${BASE}/challenges/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, challengeId }),
  });
  if (!res.ok) throw new Error('Unable to complete challenge');
  return res.json(); // Updated user data with challenges, points, etc.
}

export async function incrementRoutesCompleted(uid: string) {
  const res = await fetch(`${BASE}/increment-routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error('Unable to increment routes completed');
  return res.json();
}
