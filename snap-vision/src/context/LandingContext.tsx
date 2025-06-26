// src/context/LandingContext.tsx
import React, { createContext, useContext, useState } from 'react';

const LandingContext = createContext<{
  hasSeenLanding: boolean;
  setHasSeenLanding: (val: boolean) => void;
}>({
  hasSeenLanding: false,
  setHasSeenLanding: () => {},
});

export const LandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  return (
    <LandingContext.Provider value={{ hasSeenLanding, setHasSeenLanding }}>
      {children}
    </LandingContext.Provider>
  );
};

export const useLanding = () => useContext(LandingContext);
