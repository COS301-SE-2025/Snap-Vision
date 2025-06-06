// snap-vision/__tests__/test-utils/ThemeProviderWrapper.tsx
import React from 'react';
import { ThemeProvider } from '../../src/theme/ThemeContext';

export const ThemeProviderWrapper = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);