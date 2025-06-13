import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TextToSpeech from '../src/components/molecules/TextToSpeech';
import { ThemeProvider } from '../src/theme/ThemeContext'; // Adjust the path if needed
import Tts from 'react-native-tts';

jest.mock('react-native-tts', () => ({
  stop: jest.fn(),
  speak: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  getInitStatus: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
}));

// Helper to wrap components in ThemeProvider
const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('TextToSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={onToggle}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    fireEvent.press(getByText('Voice On'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('does not render Voice On when inactive', () => {
    const { queryByText } = renderWithTheme(
      <TextToSpeech
        isActive={false}
        onToggle={() => {}}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    expect(queryByText('Voice On')).toBeNull();
  });
  it('renders speaker icon when active', () => {
    const { getByText } = renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    expect(getByText('🔊')).toBeTruthy();
  });
  it('renders muted icon when inactive', () => {
    const { getByText } = renderWithTheme(
      <TextToSpeech
        isActive={false}
        onToggle={() => {}}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    expect(getByText('🔇')).toBeTruthy();
  });

  it('calls onToggle when muted icon is pressed', () => {
    const onToggle = jest.fn();
    const { getByText } = renderWithTheme(
      <TextToSpeech
        isActive={false}
        onToggle={onToggle}
        text="Hello"
        onSpeakingChange={() => {}}
      />
    );
    fireEvent.press(getByText('🔇'));
    expect(onToggle).toHaveBeenCalled();
  });
});