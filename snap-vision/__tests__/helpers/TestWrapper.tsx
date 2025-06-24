import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '../../src/theme/ThemeContext';

interface TestWrapperProps {
  children: React.ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <ThemeProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </ThemeProvider>
  );
}