//snap-vision\src\theme\ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { ThemeName, BaseTheme, getBaseTheme, isDarkTheme, getThemeVariant } from './index';

interface ThemeContextType {
  theme: ThemeName;
  baseTheme: BaseTheme;
  isDark: boolean;
  toggleDarkMode: () => void;
  setBaseTheme: (baseTheme: BaseTheme) => void;
  setTheme: (themeName: ThemeName) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const BASE_THEME_STORAGE_KEY = '@snap_vision_base_theme';
const DARK_MODE_STORAGE_KEY = '@snap_vision_dark_mode';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemPrefersDark = Appearance.getColorScheme() === 'dark';
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>('light');
  const [isDark, setIsDarkState] = useState<boolean>(systemPrefersDark);
  const [theme, setThemeState] = useState<ThemeName>(systemPrefersDark ? 'dark' : 'light');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Update theme state when base theme or dark mode changes
  useEffect(() => {
    const newTheme = getThemeVariant(baseTheme, isDark);
    setThemeState(newTheme);
  }, [baseTheme, isDark]);

  // Listen to auth state changes and load theme accordingly
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      const newUserId = user?.uid || null;

      // If user changed (logged out or different user logged in)
      if (currentUserId !== newUserId) {
        setCurrentUserId(newUserId);

        if (!newUserId) {
          // User logged out - reset to system defaults
          const systemDark = Appearance.getColorScheme() === 'dark';
          setBaseThemeState('light');
          setIsDarkState(systemDark);
          // Clear stored preferences
          try {
            await AsyncStorage.multiRemove([BASE_THEME_STORAGE_KEY, DARK_MODE_STORAGE_KEY]);
          } catch (error) {
            console.warn('Failed to clear theme preferences:', error);
          }
        } else {
          // User logged in - load their theme preferences
          await loadThemeForUser();
        }
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, [currentUserId]);

  // Load theme preferences from storage for current user
  const loadThemeForUser = async () => {
    try {
      const [savedBaseTheme, savedDarkMode] = await AsyncStorage.multiGet([
        BASE_THEME_STORAGE_KEY,
        DARK_MODE_STORAGE_KEY,
      ]);

      // Load base theme
      const baseThemeValue = savedBaseTheme[1];
      if (baseThemeValue && ['light', 'pink', 'ocean', 'forest'].includes(baseThemeValue)) {
        setBaseThemeState(baseThemeValue as BaseTheme);
      } else {
        setBaseThemeState('light');
      }

      // Load dark mode preference
      const darkModeValue = savedDarkMode[1];
      if (darkModeValue !== null) {
        setIsDarkState(darkModeValue === 'true');
      } else {
        // No saved dark mode preference, use system default
        setIsDarkState(Appearance.getColorScheme() === 'dark');
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error);
      // Fallback to defaults
      setBaseThemeState('light');
      setIsDarkState(Appearance.getColorScheme() === 'dark');
    }
  };

  const setBaseTheme = async (newBaseTheme: BaseTheme) => {
    setBaseThemeState(newBaseTheme);

    // Only save to storage if user is logged in
    if (currentUserId) {
      try {
        await AsyncStorage.setItem(BASE_THEME_STORAGE_KEY, newBaseTheme);
      } catch (error) {
        console.warn('Failed to save base theme preference:', error);
      }
    }
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDark;
    setIsDarkState(newDarkMode);

    // Only save to storage if user is logged in
    if (currentUserId) {
      try {
        await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, newDarkMode.toString());
      } catch (error) {
        //console.warn('Failed to save dark mode preference:', error);
      }
    }
  };

  // Legacy setTheme function for backwards compatibility
  const setTheme = async (themeName: ThemeName) => {
    const newBaseTheme = getBaseTheme(themeName);
    const newIsDark = isDarkTheme(themeName);

    setBaseThemeState(newBaseTheme);
    setIsDarkState(newIsDark);

    // Save both preferences if user is logged in
    if (currentUserId) {
      try {
        await AsyncStorage.multiSet([
          [BASE_THEME_STORAGE_KEY, newBaseTheme],
          [DARK_MODE_STORAGE_KEY, newIsDark.toString()],
        ]);
      } catch (error) {
        //console.warn('Failed to save theme preferences:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        baseTheme,
        isDark,
        toggleDarkMode,
        setBaseTheme,
        setTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
