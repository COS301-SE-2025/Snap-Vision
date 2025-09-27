//snap-vision\src\theme\ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName } from './index';

interface ThemeContextType {
  theme: ThemeName;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (themeName: ThemeName) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@snap_vision_theme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemPrefersDark = Appearance.getColorScheme() === 'dark';
  const [theme, setThemeState] = useState<ThemeName>(systemPrefersDark ? 'dark' : 'light');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'pink', 'ocean', 'forest'].includes(savedTheme)) {
          setThemeState(savedTheme as ThemeName);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const setTheme = async (themeName: ThemeName) => {
    setThemeState(themeName);

    // Save theme to storage
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
