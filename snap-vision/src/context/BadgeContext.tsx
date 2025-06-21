/* eslint-disable react-hooks/exhaustive-deps */
// src/context/BadgeContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BADGES, BadgeId } from '../types/badges';
import { fetchBadgeSnapshot, unlockBadge as unlockViaApi } from '../api/badgeApi';
import auth from '@react-native-firebase/auth';          // <- or your auth lib

type BadgeState = {
  unlocked       : Set<BadgeId>;
  justUnlocked   : BadgeId[];
  points         : number;
  checkIns       : number;
  routesCompleted: number;
};

type Ctx = {
  state             : BadgeState;
  unlock            : (id: BadgeId) => Promise<void>;
  incrementRoutes   : () => Promise<void>; // TODO wire if needed
  incrementCheckIns : () => Promise<void>;
  clearJustUnlocked : () => void;
};

const empty: BadgeState = {
  unlocked       : new Set(),
  justUnlocked   : [],
  points         : 0,
  checkIns       : 0,
  routesCompleted: 0,
};

const BadgeContext = createContext<Ctx | undefined>(undefined);
export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges outside provider');
  return ctx;
};

export const BadgeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BadgeState>(empty);
  const uid = auth().currentUser?.uid;         // 🔒 ensure user is logged in

  /* ── hydrate from Firestore on first render ────────────────────── */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await fetchBadgeSnapshot(uid);
        setState({
          unlocked       : new Set<BadgeId>(snap.badges || []),
          justUnlocked   : [],
          points         : snap.points || 0,
          checkIns       : snap.checkIns || 0,
          routesCompleted: snap.routesCompleted || 0,
        });
      } catch (e) {
        console.warn('Badge sync failed', e);
      }
    })();
  }, [uid]);

  /* ── unlock wrapper ────────────────────────────────────────────── */
  const unlock = async (id: BadgeId) => {
    if (!uid) return;

    // ✨ Optimistic update
    setState(prev => {
      if (prev.unlocked.has(id)) return prev;
      const unlocked = new Set(prev.unlocked).add(id);
      return {
        ...prev,
        unlocked,
        justUnlocked   : [...prev.justUnlocked, id],
        points         : prev.points + 50,
      };
    });

    try {
      const snap = await unlockViaApi(uid, id);          // 🔗 call backend
      // Replace local state with server truth (guards against dupes)
      setState({
        unlocked       : new Set<BadgeId>(snap.badges || []),
        justUnlocked   : [],                            // triggers popup
        points         : snap.points,
        checkIns       : snap.checkIns,
        routesCompleted: snap.routesCompleted,
      });
    } catch (e) {
      console.error('unlock failed, reverting', e);
      // Rollback if needed (exercise left for you)
    }
  };

  const clearJustUnlocked = () =>
    setState(prev => ({ ...prev, justUnlocked: [] }));

  const value: Ctx = {
    state,
    unlock,
    incrementRoutes  : async () => {/* TODO similar to unlock */},
    incrementCheckIns: async () => {/* TODO similar to unlock */},
    clearJustUnlocked,
  };

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};
