/* eslint-disable react-hooks/exhaustive-deps */
// src/context/BadgeContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BADGES, BadgeId } from '../types/badges';
import { fetchBadgeSnapshot, unlockBadge as unlockViaApi } from '../api/badgeApi';
import auth from '@react-native-firebase/auth';         
import { Challenge } from '../types/achievements'; 

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
  incrementRoutes   : () => Promise<void>; 
  incrementCheckIns : () => Promise<void>;
  clearJustUnlocked : () => void;
  getChallenges     : () => Challenge[];
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
      });
    } catch (e) {
      console.error('unlock failed, reverting', e);
    }
  };

  const clearJustUnlocked = () =>
    setState(prev => ({ ...prev, justUnlocked: [] }));

    const getChallenges = (): Challenge[] => [
      {
      id         : 'earn_150_pts',
      title      : 'Earn 150 Points',
      description: 'Unlock the Point Collector badge',
      isCompleted: state.points >= 150,
      icon       : 'wallet',
      type       : 'current',
    },
      {
      id: 'lecture_halls',
      title: 'Visit 5 Lecture Halls',
      description: 'Unlock a special guide',
      isCompleted: state.checkIns >= 5,
      icon: 'school',
      type: 'current',
    },
    {
      id: 'explore_buildings',
      title: 'Explore 3 New Buildings',
      description: 'Unlock a badge',
      isCompleted: state.routesCompleted >= 3,
      icon: 'business',
      type: 'current',
    },
    {
      id: 'points_master',
      title: 'Earn 500 Points',
      description: 'Become a legend!',
      isCompleted: state.points >= 500,
      icon: 'star',
      type: 'current',
    },
  ];


  const value: Ctx = {
    state,
    unlock,
    incrementRoutes  : async () => {/* TODO similar to unlock */},
    incrementCheckIns: async () => {/* TODO similar to unlock */},
    clearJustUnlocked,
    getChallenges,
    
  };


  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
};
