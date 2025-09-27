//snap-vision\src\theme\index.ts
import { lightColors, darkColors, pinkColors, oceanColors, forestColors } from './colours';

export type ThemeName = 'light' | 'dark' | 'pink' | 'ocean' | 'forest';

export const themeOptions = {
  light: lightColors,
  dark: darkColors,
  pink: pinkColors,
  ocean: oceanColors,
  forest: forestColors,
};

export const getThemeColors = (themeName: ThemeName) => {
  return themeOptions[themeName] || lightColors;
};
