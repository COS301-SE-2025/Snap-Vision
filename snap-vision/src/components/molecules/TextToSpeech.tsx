// src/components/molecules/TextToSpeech.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Tts from 'react-native-tts';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { StyleSheet } from 'react-native';

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

  // Initialize TTS
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        await Tts.getInitStatus();
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);
        
        Tts.addEventListener('tts-start', () => {
          setIsSpeaking(true);
          onSpeakingChange?.(true);
        });
        
        Tts.addEventListener('tts-finish', () => {
          setIsSpeaking(false);
          onSpeakingChange?.(false);
        });
        
        Tts.addEventListener('tts-cancel', () => {
          setIsSpeaking(false);
          onSpeakingChange?.(false);
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
  }, []);

  // Speak when text changes and TTS is active
  useEffect(() => {
    if (isActive && text) {
      speakText(text);
    }
  }, [text, isActive]);

  const speakText = (textToSpeak: string) => {
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
  };

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
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 2,
    alignSelf: 'center',
    backgroundColor: '#222',
    minWidth: 90,
    minHeight: 32,
    justifyContent: 'center',
    elevation: 2,
    position: 'absolute',
    bottom: 32, // Move to bottom of the screen
    left: '50%',
    transform: [{ translateX: -60 }],
    zIndex: 20,
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