import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BadgeId, Badge } from '../types/badges';
import {
  unlockBadgeForUser,
  getUserBadgeData,
  incrementRoutesCompletedForUser,
} from '../services/badgeService';
import { BADGES } from '../types/badges';
import auth from '@react-native-firebase/auth';

type BadgeState = {
  unlocked: Set<BadgeId>;
  justUnlocked: BadgeId[];
  points: number;
  checkIns: number;
  routesCompleted: number;
  purchases: { itemId: string; [key: string]: any }[];
  badges: Record<BadgeId, Badge>;
};

type Ctx = {
  state: BadgeState;
  setState: React.Dispatch<React.SetStateAction<BadgeState>>;
  unlock: (id: BadgeId) => Promise<void>;
  incrementRoutes: () => Promise<void>;
  incrementCheckIns: () => Promise<void>;
  clearJustUnlocked: () => void;
  setNavigationStartTime: (time: number) => void;
  maybeUnlockFastFinisher: () => Promise<void>;
  loading: boolean;
  uid: string | null;
};

const empty: BadgeState = {
  unlocked: new Set(),
  justUnlocked: [],
  points: 0,
  checkIns: 0,
  routesCompleted: 0,
  purchases: [],
  badges: {} as Record<BadgeId, Badge>,
};

const BadgeContext = createContext<Ctx | undefined>(undefined);

export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges must be used within a BadgeProvider');
  return ctx;
};

export const BadgeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<BadgeState>(empty);
  const [navigationStartTime, setNavigationStartTime] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(auth().currentUser?.uid || null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, badges: BADGES }));
  }, []);

  useEffect(() => {
    if (!uid) return;

    const loadUserData = async () => {
      setLoading(true);
      try {
        const snap = await getUserBadgeData(uid);
        if (snap) {
          setState((prev) => ({
            ...prev,
            unlocked: new Set<BadgeId>(snap.badges || []),
            justUnlocked: [],
            points: snap.points || 0,
            checkIns: snap.checkIns || 0,
            routesCompleted: snap.routesCompleted || 0,
            purchases: snap.purchases || [],
          }));
        }
      } catch (e) {
        console.warn('Failed to load badge data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [uid]);

  const unlock = async (id: BadgeId) => {
    if (!uid) {
      console.log('Unlock aborted: no UID');
      return;
    }

    try {
      // Optimistic update
      setState((prev) => {
        if (prev.unlocked.has(id)) return prev;
        return {
          ...prev,
          unlocked: new Set(prev.unlocked).add(id),
          justUnlocked: [...prev.justUnlocked, id],
          points: prev.points + 50,
        };
      });

      // Firestore update
      await unlockBadgeForUser(uid, id);

      // Sync with latest data
      const snap = await getUserBadgeData(uid);
      if (snap) {
        setState((prev) => ({
          ...prev,
          unlocked: new Set<BadgeId>(snap.badges || []),
          justUnlocked: [],
          points: snap.points || 0,
          checkIns: snap.checkIns || 0,
          routesCompleted: snap.routesCompleted || 0,
          purchases: snap.purchases || [],
        }));
      }
    } catch (e) {
      console.error('Failed to unlock badge:', e);
      // Revert optimistic update
      setState((prev) => ({
        ...prev,
        unlocked: new Set([...prev.unlocked].filter((b) => b !== id)),
        justUnlocked: prev.justUnlocked.filter((b) => b !== id),
        points: prev.points - 50,
      }));
    }
  };

  const incrementRoutes = async () => {
    if (!uid) return;

    try {
      const updated = await incrementRoutesCompletedForUser(uid);
      setState((prev) => ({
        ...prev,
        routesCompleted: updated?.routesCompleted || prev.routesCompleted,
        unlocked: new Set<BadgeId>(updated?.badges || []),
        justUnlocked: (updated?.badges || []).filter((b: BadgeId) => !prev.unlocked.has(b)),
      }));
    } catch (e) {
      console.error('Failed to increment routes:', e);
    }
  };

  const value: Ctx = {
    state,
    setState,
    unlock,
    incrementRoutes,
    incrementCheckIns: async () => {}, // Implement if needed
    clearJustUnlocked: () => setState((prev) => ({ ...prev, justUnlocked: [] })),
    setNavigationStartTime: (time) => setNavigationStartTime(time),
    maybeUnlockFastFinisher: async () => {
      if (!navigationStartTime || !uid) return;
      const elapsed = (Date.now() - navigationStartTime) / 1000;
      if (elapsed <= 300 && !state.unlocked.has('fast-finisher')) {
        await unlock('fast-finisher');
      }
    },
    loading,
    uid,
  };

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};
