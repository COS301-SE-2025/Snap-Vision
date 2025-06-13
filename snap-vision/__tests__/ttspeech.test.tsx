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

  it('calls Tts.speak when active with text', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Hello world"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).toHaveBeenCalledWith('Hello world');
  });

  it('calls Tts.stop before speaking', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Hello world"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.stop).toHaveBeenCalled();
  });
  it('does not call Tts.speak when inactive', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={false}
        onToggle={() => {}}
        text="Hello world"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).not.toHaveBeenCalled();
  });

  it('does not call Tts.speak when no text provided', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).not.toHaveBeenCalled();
  });
  it('replaces m with meters in text', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Walk 5 m forward"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).toHaveBeenCalledWith('Walk 5 meters forward');
  });
  it('replaces km with kilometers in text', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Drive 2 km north"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).toHaveBeenCalledWith('Drive 2 kilometers north');
  });

  it('replaces ft with feet in text', () => {
    renderWithTheme(
      <TextToSpeech
        isActive={true}
        onToggle={() => {}}
        text="Go 10 ft ahead"
        onSpeakingChange={() => {}}
      />
    );
    expect(Tts.speak).toHaveBeenCalledWith('Go 10 feet ahead');
  });
});