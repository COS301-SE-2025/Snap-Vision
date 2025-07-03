// src/context/LandingContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LandingContext = createContext<{
  hasSeenLanding: boolean;
  setHasSeenLanding: (val: boolean) => void;
}>({
  hasSeenLanding: false,
  setHasSeenLanding: () => {},
});

export const LandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasSeenLanding, setHasSeenLandingState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenLanding').then((value) => {
      if (value === 'true') setHasSeenLandingState(true);
    });
  }, []);

  const setHasSeenLanding = (val: boolean) => {
    setHasSeenLandingState(val);
    AsyncStorage.setItem('hasSeenLanding', val ? 'true' : 'false');
  };

  return (
    <LandingContext.Provider value={{ hasSeenLanding, setHasSeenLanding }}>
      {children}
    </LandingContext.Provider>
  );
};

export const useLanding = () => useContext(LandingContext);
