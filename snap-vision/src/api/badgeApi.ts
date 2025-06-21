// src/api/badgeApi.ts
import { BadgeId } from '../types/badges';

// Android emulator uses 10.0.2.2 to access localhost on your PC
const BASE = 'http://10.0.2.2:3000/api/badges';

export async function fetchBadgeSnapshot(uid: string) {
  const res = await fetch(`${BASE}/${uid}`);
  if (!res.ok) throw new Error('Unable to fetch badge data');
  return res.json();                // { badges:[], points, ... }
}
