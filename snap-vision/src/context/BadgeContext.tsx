import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BadgeId } from '../types/badges';
import {
  unlockBadgeForUser,
  getUserBadgeData,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
} from '../services/badgeService';
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
  const [uid, setUid] = useState<string | null>(auth().currentUser?.uid || null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) return;
    
    const loadUserData = async () => {
      setLoading(true);
      try {
        const snap = await getUserBadgeData(uid);
        if (snap) {
          setState({
            unlocked: new Set<BadgeId>(snap.badges || []),
            justUnlocked: [],
            points: snap.points || 0,
            checkIns: snap.checkIns || 0,
            routesCompleted: snap.routesCompleted || 0,
            purchases: snap.purchases || [],
            completedChallenges: new Set<string>(snap.completedChallenges || []),
          });
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
      setState(prev => {
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
        setState({
          unlocked: new Set<BadgeId>(snap.badges || []),
          justUnlocked: [],
          points: snap.points || 0,
          checkIns: snap.checkIns || 0,
          routesCompleted: snap.routesCompleted || 0,
          purchases: snap.purchases || [],
          completedChallenges: new Set<string>(snap.completedChallenges || []),
        });
      }
    } catch (e) {
      console.error('Failed to unlock badge:', e);
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        unlocked: new Set([...prev.unlocked].filter(b => b !== id)),
        justUnlocked: prev.justUnlocked.filter(b => b !== id),
        points: prev.points - 50,
      }));
    }
  };

  const incrementRoutes = async () => {
    if (!uid) return;
    
    try {
      const updated = await incrementRoutesCompletedForUser(uid);
      setState(prev => ({
        ...prev,
        routesCompleted: updated?.routesCompleted || prev.routesCompleted,
        unlocked: new Set<BadgeId>(updated?.badges || []),
        justUnlocked: (updated?.badges || []).filter((b: BadgeId) => !prev.unlocked.has(b)),
      }));
    } catch (e) {
      console.error('Failed to increment routes:', e);
    }
  };

  const completeChallenge = async (challengeId: string) => {
    if (!uid) return;
    
    try {
      const updated = await completeChallengeForUser(uid, challengeId);
      setState(prev => ({
        ...prev,
        points: updated?.points || prev.points,
        completedChallenges: new Set<string>(updated?.completedChallenges || [...prev.completedChallenges, challengeId]),
      }));
    } catch (e) {
      console.error('Failed to complete challenge:', e);
    }
  };

  const clearJustUnlocked = () => setState(prev => ({ ...prev, justUnlocked: [] }));

  const getChallenges = (): Challenge[] => [
    {
      id: 'earn_150_pts',
      title: 'Earn 150 Points',
      description: 'Unlock the Point Collector badge',
      isCompleted: state.completedChallenges.has('earn_150_pts'),
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
    incrementRoutes,
    incrementCheckIns: async () => {}, // Implement if needed
    clearJustUnlocked,
    getChallenges,
    completeChallenge,
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