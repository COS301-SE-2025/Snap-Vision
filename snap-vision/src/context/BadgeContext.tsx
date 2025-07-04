import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BadgeId } from '../types/badges';
import {
  fetchBadgeSnapshot,
  unlockBadge as unlockViaApi,
  completeChallenge as completeChallengeApi,
  incrementRoutesCompleted,
} from '../api/badgeApi';
import auth from '@react-native-firebase/auth';
import { Challenge } from '../types/achievements';

type BadgeState = {
  unlocked: Set<BadgeId>;
  justUnlocked: BadgeId[];
  points: number;
  checkIns: number;
  routesCompleted: number;
  purchases: { itemId: string; [key: string]: any }[];
  completedChallenges: Set<string>;
};

type Ctx = {
  state: BadgeState;
  setState: React.Dispatch<React.SetStateAction<BadgeState>>;
  unlock: (id: BadgeId) => Promise<void>;
  incrementRoutes: () => Promise<void>;
  incrementCheckIns: () => Promise<void>;
  clearJustUnlocked: () => void;
  getChallenges: () => Challenge[];
  setNavigationStartTime: (time: number) => void;
  maybeUnlockFastFinisher: () => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
};

const empty: BadgeState = {
  unlocked: new Set(),
  justUnlocked: [],
  points: 0,
  checkIns: 0,
  routesCompleted: 0,
  purchases: [],
  completedChallenges: new Set(),
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
  const uid = auth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await fetchBadgeSnapshot(uid);
        setState({
          unlocked: new Set<BadgeId>(snap.badges || []),
          justUnlocked: [],
          points: snap.points || 0,
          checkIns: snap.checkIns || 0,
          routesCompleted: snap.routesCompleted || 0,
          purchases: snap.purchases || [],
          completedChallenges: new Set<string>(snap.completedChallenges || []),
        });
      } catch (e) {
        console.warn('Badge sync failed', e);
      }
    })();
  }, [uid]);

  const unlock = async (id: BadgeId) => {
    if (!uid) return;

    setState((prev) => {
      if (prev.unlocked.has(id)) return prev;
      const unlocked = new Set(prev.unlocked).add(id);
      return {
        ...prev,
        unlocked,
        justUnlocked: [...prev.justUnlocked, id],
        points: prev.points + 50,
      };
    });

    try {
      const snap = await unlockViaApi(uid, id);
      setState({
        unlocked: new Set<BadgeId>(snap.badges || []),
        justUnlocked: [],
        points: snap.points,
        checkIns: snap.checkIns,
        routesCompleted: snap.routesCompleted,
        purchases: snap.purchases || [],
        completedChallenges: new Set<string>(snap.completedChallenges || []),
      });
    } catch (e) {
      console.error('unlock failed, reverting', e);
    }
  };

  const incrementRoutes = async () => {
    if (!uid) return;
    try {
      const updated = await incrementRoutesCompleted(uid);
      setState((prev) => ({
        ...prev,
        routesCompleted: updated.routesCompleted,
        unlocked: new Set(updated.badges || []),
        justUnlocked: (updated.badges || []).filter((b: BadgeId) => !prev.unlocked.has(b)),
      }));
    } catch (e) {
      console.error('Failed to increment routes:', e);
    }
  };

  const clearJustUnlocked = () => setState((prev) => ({ ...prev, justUnlocked: [] }));

  const completeChallenge = async (challengeId: string) => {
    if (!uid) return;

    try {
      const updatedData = await completeChallengeApi(uid, challengeId);

      setState((prev) => ({
        ...prev,
        points: updatedData.points,
        completedChallenges: new Set<string>(
          updatedData.completedChallenges || [...prev.completedChallenges, challengeId],
        ),
      }));
    } catch (e) {
      console.error('Complete challenge failed', e);
    }
  };
  const getChallenges = (): Challenge[] => [
    {
      id: 'earn_150_pts',
      title: 'Earn 150 Points',
      description: 'Unlock the Point Collector badge',
      isCompleted: state.completedChallenges.has('earn_150_pts'), // <-- only completedChallenges
      icon: 'wallet',
      type: 'current',
    },
    {
      id: 'lecture_halls',
      title: 'Visit 5 Lecture Halls',
      description: 'Unlock a special guide',
      isCompleted: state.completedChallenges.has('lecture_halls'),
      icon: 'school',
      type: 'current',
    },
    {
      id: 'explore_buildings',
      title: 'Explore 3 New Buildings',
      description: 'Unlock a badge',
      isCompleted: state.completedChallenges.has('explore_buildings'),
      icon: 'business',
      type: 'current',
    },
    {
      id: 'fast_finisher',
      title: 'Speed Runner',
      description: 'Reach a destination within 5 minutes of starting navigation',
      isCompleted: state.completedChallenges.has('fast_finisher'),
      icon: 'speedometer',
      type: 'current',
    },
    {
      id: 'points_master',
      title: 'Earn 500 Points',
      description: 'Become a legend!',
      isCompleted: state.completedChallenges.has('points_master'),
      icon: 'star',
      type: 'current',
    },
  ];

  const value: Ctx = {
    state,
    setState,
    unlock,
    incrementRoutes: async () => {},
    incrementCheckIns: async () => {},
    clearJustUnlocked,
    getChallenges,
    completeChallenge,
    setNavigationStartTime: (time) => setNavigationStartTime(time),
    maybeUnlockFastFinisher: async () => {
      if (!navigationStartTime) return;
      const elapsed = (Date.now() - navigationStartTime) / 1000;
      if (elapsed <= 300 && !state.unlocked.has('fast-finisher')) {
        await unlock('fast-finisher');
      }
    },
  };

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};
