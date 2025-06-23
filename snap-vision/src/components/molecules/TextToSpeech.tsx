// src/components/molecules/TextToSpeech.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Tts from 'react-native-tts';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface TextToSpeechProps {
  isActive: boolean;
  onToggle: () => void;
  text?: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({
  isActive,
  onToggle,
  text,
  onSpeakingChange,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Define speakText as a useCallback to properly handle dependencies
  const speakText = useCallback((textToSpeak: string) => {
    if (!isActive) return;
    
    try {
      Tts.stop();
      const cleanText = textToSpeak
        .replace(/\bm\b/g, 'meters')
        .replace(/\bkm\b/g, 'kilometers')
        .replace(/\bft\b/g, 'feet')
        .replace(/\byd\b/g, 'yards');
      Tts.speak(cleanText);
    } catch (error) {
      console.error('TTS speak error:', error);
    }
  }, [isActive]);

  // Initialize TTS
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        await Tts.getInitStatus();
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);
        
        Tts.addEventListener('tts-start', () => {
          setIsSpeaking(true);
          if (onSpeakingChange) onSpeakingChange(true);
        });
        
        Tts.addEventListener('tts-finish', () => {
          setIsSpeaking(false);
          if (onSpeakingChange) onSpeakingChange(false);
        });
        
        Tts.addEventListener('tts-cancel', () => {
          setIsSpeaking(false);
          if (onSpeakingChange) onSpeakingChange(false);
        });
      } catch (error) {
        console.error('TTS initialization failed:', error);
      }
    };

    initializeTTS();

    return () => {
      Tts.stop();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, [onSpeakingChange]); // Added onSpeakingChange as a dependency

  // Speak when text changes and TTS is active
  useEffect(() => {
    if (isActive && text) {
      speakText(text);
    }
  }, [text, isActive, speakText]); // Added speakText as a dependency

  const handlePress = () => {
    if (isSpeaking) {
      Tts.stop();
    }
    onToggle();
  };

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: isActive ? colors.primary : colors.card }
      ]}
      onPress={handlePress}
    >
      <Text style={[styles.icon, { color: colors.text }]}>
        {isSpeaking ? '🛑' : isActive ? '🔊' : '🔇'}
      </Text>
      {isActive && (
        <Text style={[styles.label, { color:'#fff' }]}>
          {isSpeaking ? 'Stop' : 'Voice On'}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    height: 36,
    width: 100,
    backgroundColor: '#222',
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default TextToSpeech;