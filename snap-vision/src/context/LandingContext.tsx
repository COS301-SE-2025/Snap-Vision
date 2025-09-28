import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'hasSeenLanding';

const LandingContext = createContext<{
  hasSeenLanding: boolean;
  setHasSeenLanding: (val: boolean) => void;
  loading: boolean;
}>({
  hasSeenLanding: false,
  setHasSeenLanding: () => {},
  loading: true,
});

export const LandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHasSeenLanding = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedValue !== null) {
          setHasSeenLanding(storedValue === 'true');
        }
      } catch (e) {
        ////consoleerror('Failed to load hasSeenLanding from storage', e);
      } finally {
        setLoading(false);
      }
    };
    loadHasSeenLanding();
  }, []);

  const updateHasSeenLanding = async (val: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
      setHasSeenLanding(val);
    } catch (e) {
      ////consoleerror('Failed to save hasSeenLanding to storage', e);
    }
  };

  return (
    <LandingContext.Provider
      value={{ hasSeenLanding, setHasSeenLanding: updateHasSeenLanding, loading }}
    >
      {children}
    </LandingContext.Provider>
  );
};

export const useLanding = () => useContext(LandingContext);
