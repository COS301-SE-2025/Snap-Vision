import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AccessibilitySettings {
  isHapticFeedbackEnabled: boolean;
  isAccessibilityModeEnabled: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setHapticFeedbackEnabled: (enabled: boolean) => Promise<void>;
  setAccessibilityModeEnabled: (enabled: boolean) => Promise<void>;
  loading: boolean;
}

const defaultSettings: AccessibilitySettings = {
  isHapticFeedbackEnabled: true,
  isAccessibilityModeEnabled: false,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultSettings,
  setHapticFeedbackEnabled: async () => {},
  setAccessibilityModeEnabled: async () => {},
  loading: true,
});

const STORAGE_KEYS = {
  HAPTIC_FEEDBACK: '@accessibility/hapticFeedback',
  ACCESSIBILITY_MODE: '@accessibility/accessibilityMode',
};

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const hapticEnabled = await AsyncStorage.getItem(STORAGE_KEYS.HAPTIC_FEEDBACK);
      const accessibilityMode = await AsyncStorage.getItem(STORAGE_KEYS.ACCESSIBILITY_MODE);

      setSettings({
        isHapticFeedbackEnabled: hapticEnabled !== null ? JSON.parse(hapticEnabled) : true,
        isAccessibilityModeEnabled:
          accessibilityMode !== null ? JSON.parse(accessibilityMode) : false,
      });
    } catch (error) {
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

  const setAccessibilityModeEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESSIBILITY_MODE, JSON.stringify(enabled));
      setSettings((prev) => ({ ...prev, isAccessibilityModeEnabled: enabled }));
    } catch (error) {
      throw error;
    }
  };

  const value: AccessibilityContextType = {
    ...settings,
    setHapticFeedbackEnabled,
    setAccessibilityModeEnabled,
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
