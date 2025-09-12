import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AccessibilitySettings {
  isHapticFeedbackEnabled: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setHapticFeedbackEnabled: (enabled: boolean) => Promise<void>;
  loading: boolean;
}

const defaultSettings: AccessibilitySettings = {
  isHapticFeedbackEnabled: true,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultSettings,
  setHapticFeedbackEnabled: async () => {},
  loading: true,
});

const STORAGE_KEYS = {
  HAPTIC_FEEDBACK: '@accessibility/hapticFeedback',
};

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings from AsyncStorage on app start
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const hapticEnabled = await AsyncStorage.getItem(STORAGE_KEYS.HAPTIC_FEEDBACK);

      setSettings({
        isHapticFeedbackEnabled: hapticEnabled !== null ? JSON.parse(hapticEnabled) : true,
      });
    } catch (error) {
      //consoleerror('Failed to load accessibility settings:', error);
      // Use defaults if loading fails
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const setHapticFeedbackEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAPTIC_FEEDBACK, JSON.stringify(enabled));
      setSettings((prev) => ({ ...prev, isHapticFeedbackEnabled: enabled }));
    } catch (error) {
      //consoleerror('Failed to save haptic feedback setting:', error);
      throw error;
    }
  };

  const value: AccessibilityContextType = {
    ...settings,
    setHapticFeedbackEnabled,
    loading,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
