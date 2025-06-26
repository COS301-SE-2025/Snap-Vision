//snap-vision\src\theme\index.ts
import { lightColors, darkColors } from './colours';

export const getThemeColors = (isDark: boolean) => {
  return isDark ? darkColors : lightColors;
};
