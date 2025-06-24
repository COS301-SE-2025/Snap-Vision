
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BADGES, BadgeId } from '../types/badges';
import { fetchBadgeSnapshot, unlockBadge as unlockViaApi } from '../api/badgeApi';
import auth from '@react-native-firebase/auth';         
import { Challenge } from '../types/achievements'; 
import { completeChallenge as completeChallengeApi } from '../api/badgeApi';

type BadgeState = {
  unlocked       : Set<BadgeId>;
  justUnlocked   : BadgeId[];
  points         : number;
  checkIns       : number;
  routesCompleted: number;
  purchases      : { itemId: string; [key: string]: any }[]; 
  completedChallenges: string[]; 
};

type Ctx = {
  state             : BadgeState;
  setState          : React.Dispatch<React.SetStateAction<BadgeState>>;
  unlock            : (id: BadgeId) => Promise<void>;
  incrementRoutes   : () => Promise<void>; 
  incrementCheckIns : () => Promise<void>;
  clearJustUnlocked : () => void;
  getChallenges     : () => Challenge[];
  setNavigationStartTime: (time: number) => void;
  maybeUnlockFastFinisher: () => Promise<void>;
  completeChallenge : (challengeId: string) => Promise<void>;
};

const empty: BadgeState = {
  unlocked       : new Set(),
  justUnlocked   : [],
  points         : 0,
  checkIns       : 0,
  routesCompleted: 0,
  purchases      : [],
  completedChallenges: [],
};


const BadgeContext = createContext<Ctx | undefined>(undefined);

export const useBadges = () => {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges outside provider');
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
          unlocked       : new Set<BadgeId>(snap.badges || []),
          justUnlocked   : [],
          points         : snap.points || 0,
          checkIns       : snap.checkIns || 0,
          routesCompleted: snap.routesCompleted || 0,
          purchases      : snap.purchases || [], 
          completedChallenges: snap.completedChallenges || [],
        });
      } catch (e) {
        console.warn('Badge sync failed', e);
      }
    })();
  }, [uid]);

  const unlock = async (id: BadgeId) => {
    if (!uid) return;

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
      const snap = await unlockViaApi(uid, id);          
      setState({
        unlocked       : new Set<BadgeId>(snap.badges || []),
        justUnlocked   : [],                          
        points         : snap.points,
        checkIns       : snap.checkIns,
        routesCompleted: snap.routesCompleted,
        purchases      : snap.purchases || [],
        completedChallenges: snap.completedChallenges || [],
      });
    } catch (e) {
      console.error('unlock failed, reverting', e);
    }
  };

  const clearJustUnlocked = () =>
    setState(prev => ({ ...prev, justUnlocked: [] }));

   const completeChallenge = async (challengeId: string) => {
    if (!uid) return;

    try {
      const updatedData = await completeChallengeApi(uid, challengeId);

      setState(prev => {
        return {
          ...prev,
          points: updatedData.points,
          // Assuming your Firestore user doc now includes completedChallenges array
          completedChallenges: updatedData.completedChallenges || prev.completedChallenges || [],
        };
      });
    } catch (e) {
      console.error('Complete challenge failed', e);
    }
  };

    const getChallenges = (): Challenge[] => [
      {
      id         : 'earn_150_pts',
      title      : 'Earn 150 Points',
      description: 'Unlock the Point Collector badge',
      isCompleted: state.completedChallenges?.includes('earn_150_pts') || state.points >= 150,
      icon       : 'wallet',
      type       : 'current',
    },
    {
      id: 'lecture_halls',
      title: 'Visit 5 Lecture Halls',
      description: 'Unlock a special guide',
      isCompleted: state.completedChallenges?.includes('lecture_halls') || state.checkIns >= 5,
      icon: 'school',
      type: 'current',
    },
    {
    id: 'explore_buildings',
    title: 'Explore 3 New Buildings',
    description: 'Unlock a badge',
    isCompleted: state.routesCompleted >= 3 && state.completedChallenges.includes('explore_buildings'),
    icon: 'business',
    type: 'current',
  },
  {
    id: 'fast_finisher',
    title: 'Speed Runner',
    description: 'Reach a destination within 5 minutes of starting navigation',
    isCompleted: state.unlocked.has('fast-finisher') && state.completedChallenges.includes('fast_finisher'),
    icon: 'speedometer',
    type: 'current',
  },
  {
    id: 'points_master',
    title: 'Earn 500 Points',
    description: 'Become a legend!',
    isCompleted: state.points >= 500 && state.completedChallenges.includes('points_master'),
    icon: 'star',
    type: 'current',
  },
  ];

    const markChallengeCompleted = async (challengeId: string) => {
    if (!uid || state.completedChallenges.includes(challengeId)) return;

    const updated = [...state.completedChallenges, challengeId];
    setState(prev => ({ ...prev, completedChallenges: updated }));

    // Save to backend
    try {
      await fetch(`http://10.0.2.2:3000/api/badges/complete-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, challengeId }),
      });
    } catch (e) {
      console.error('Failed to store completed challenge:', e);
    }
  };

  const value: Ctx = {
    state,
    setState,
    unlock,
    incrementRoutes  : async () => {},
    incrementCheckIns: async () => {},
    clearJustUnlocked,
    getChallenges,
    completeChallenge,
    setNavigationStartTime: (time) => setNavigationStartTime(time),
    maybeUnlockFastFinisher: async () => {
      if (!navigationStartTime) return;
      const elapsed = (Date.now() - navigationStartTime) / 1000; // seconds
      if (elapsed <= 5 * 60 && !state.unlocked.has('fast-finisher')) {
        await unlock('fast-finisher');
      }
    },
  };

  

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};
