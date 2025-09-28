import React, { useEffect, useState } from 'react';
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
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
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
        ////consoleerror('TTS initialization failed:', error);
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
      ////consoleerror('TTS speak error:', error);
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
      style={[styles.container, { backgroundColor: isActive ? colors.primary : colors.card }]}
      onPress={handlePress}
    >
      <Text style={[styles.icon, { color: colors.text }]}>
        {isSpeaking ? '🛑' : isActive ? '🔊' : '🔇'}
      </Text>
      {isActive && (
        <Text style={[styles.label, { color: '#fff' }]}>{isSpeaking ? 'Stop' : 'Voice On'}</Text>
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
