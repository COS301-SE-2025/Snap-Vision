import React from 'react';
import { ThemeProvider } from '../../src/theme/ThemeContext';

export const ThemeProviderWrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
