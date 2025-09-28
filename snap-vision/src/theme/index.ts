//snap-vision\src\theme\index.ts
import {
  lightColors,
  darkColors,
  pinkColors,
  oceanColors,
  forestColors,
  pinkDarkColors,
  oceanDarkColors,
  forestDarkColors,
} from './colours';

export type ThemeName =
  | 'light'
  | 'dark'
  | 'pink'
  | 'ocean'
  | 'forest'
  | 'pinkDark'
  | 'oceanDark'
  | 'forestDark';
export type BaseTheme = 'light' | 'pink' | 'ocean' | 'forest';

export const themeOptions = {
  light: lightColors,
  dark: darkColors,
  pink: pinkColors,
  ocean: oceanColors,
  forest: forestColors,
  pinkDark: pinkDarkColors,
  oceanDark: oceanDarkColors,
  forestDark: forestDarkColors,
};

// Helper functions for theme management
export const getBaseTheme = (themeName: ThemeName): BaseTheme => {
  switch (themeName) {
    case 'dark':
    case 'light':
      return 'light';
    case 'pink':
    case 'pinkDark':
      return 'pink';
    case 'ocean':
    case 'oceanDark':
      return 'ocean';
    case 'forest':
    case 'forestDark':
      return 'forest';
    default:
      return 'light';
  }
};

export const isDarkTheme = (themeName: ThemeName): boolean => {
  return (
    themeName === 'dark' ||
    themeName === 'pinkDark' ||
    themeName === 'oceanDark' ||
    themeName === 'forestDark'
  );
};

export const getThemeVariant = (baseTheme: BaseTheme, isDark: boolean): ThemeName => {
  if (baseTheme === 'light') {
    return isDark ? 'dark' : 'light';
  }
  return isDark ? (`${baseTheme}Dark` as ThemeName) : baseTheme;
};

export const getThemeColors = (themeName: ThemeName) => {
  return themeOptions[themeName] || lightColors;
};
