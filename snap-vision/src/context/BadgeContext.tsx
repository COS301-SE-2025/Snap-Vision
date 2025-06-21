// ──────────────────────────────────────────────────────────────
// File: src/context/BadgeContext.tsx
// ──────────────────────────────────────────────────────────────
import React, {
  createContext,
  useContext,
  useState,
  useReducer,
  ReactNode,
  useEffect,
} from 'react';
import { BADGES } from '../types/badges';

/* ------------------------------------------------------------------
   1.  Types
------------------------------------------------------------------- */
export type BadgeId = keyof typeof BADGES; // 'first-login' | 'destination-reached' | 'qr-scan' ...

interface BadgeState {
  unlocked: Set<BadgeId>;   // all badges earned
  justUnlocked: BadgeId[];  // badges earned since last popup
  points: number;
  checkIns: number;
  routesCompleted: number;
}

interface BadgeContextType {
  state: BadgeState;
  unlock: (id: BadgeId) => void;
  incrementRoutes: () => void;
  incrementCheckIns: () => void;
  clearJustUnlocked: () => void;
}

/* ------------------------------------------------------------------
   2.  Context Setup
------------------------------------------------------------------- */
const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) {
    throw new Error('useBadges must be used inside a BadgeProvider');
  }
  return ctx;
};
