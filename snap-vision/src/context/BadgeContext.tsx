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

/* ------------------------------------------------------------------
   3.  Provider
------------------------------------------------------------------- */
const initialState: BadgeState = {
  unlocked: new Set<BadgeId>(),
  justUnlocked: [],
  points: 0,
  checkIns: 0,
  routesCompleted: 0,
};

export const BadgeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BadgeState>(initialState);

  /* ---------- core helpers ---------- */
  const unlock = (id: BadgeId) => {
    setState(prev => {
      if (prev.unlocked.has(id)) return prev; // already unlocked

      const updatedSet = new Set(prev.unlocked).add(id);
      return {
        ...prev,
        unlocked: updatedSet,
        justUnlocked: [...prev.justUnlocked, id],
        points: prev.points + 50, // 🎉 +50 per badge
      };
    });
  };

  const incrementRoutes = () => {
    setState(prev => {
      const routesCompleted = prev.routesCompleted + 1;
      // Add route‑based milestone badges here if you like
      return { ...prev, routesCompleted };
    });
  };

  const incrementCheckIns = () => {
    setState(prev => ({ ...prev, checkIns: prev.checkIns + 1 }));
  };

  const clearJustUnlocked = () =>
    setState(prev => ({ ...prev, justUnlocked: [] }));

    useEffect(() => {
    unlock('first-login');
  }, []);
  
  /* ---------- expose context ---------- */
  const value: BadgeContextType = {
    state,
    unlock,
    incrementRoutes,
    incrementCheckIns,
    clearJustUnlocked,
  };

  return (
    <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
  );
};
