import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TextToSpeech from '../src/components/molecules/TextToSpeech';
import { ThemeProvider } from '../src/theme/ThemeContext'; // Adjust the path if needed

jest.mock('react-native-tts', () => ({
  stop: jest.fn(),
  speak: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  addEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
}));

// Helper to wrap components in ThemeProvider
const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('TextToSpeech', () => {
  it('renders Voice On when active', () => {
    const { getByText } = renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    expect(getByText('Voice On')).toBeTruthy();
  });
});