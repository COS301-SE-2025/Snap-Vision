import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import Confetti from './Confetti';

import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface DestinationReachedPopupProps {
  visible: boolean;
  destination: string;
  onClose: () => void;
  themeColors?: any;
}

const { width } = Dimensions.get('window');

const DestinationReachedPopup: React.FC<DestinationReachedPopupProps> = ({
  visible,
  destination,
  onClose,
  themeColors = {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    success: '#4CAF50',
  },
}) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  const [showConfetti, setShowConfetti] = useState(false);
  const popupScale = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset and start animations when popup becomes visible
      popupScale.setValue(0);

      // Show the popup with spring animation
      Animated.spring(popupScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        // Start confetti after popup animation completes
        setShowConfetti(true);
      });
    } else {
      setShowConfetti(false);
    }
  }, [visible]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const handleConfettiComplete = () => {
    //////consolelog('Confetti animation completed');
  };

  // Debug logging for visibility issues
  useEffect(() => {
    ////consolelog('Popup visibility changed:', visible);
    if (visible) {
      ////consolelog('Showing popup with confetti animation');
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <Confetti
          active={showConfetti}
          count={100}
          onComplete={handleConfettiComplete}
          // colors={[
          //   '#FF577F',
          //   '#FF884B',
          //   '#FFCF0D',
          //   '#4361EE',
          //   themeColors.success,
          //   themeColors.primary,
          // ]}
        />

        <Animated.View
          style={[
            styles.popupContainer,
            {
              backgroundColor: colors.background,
              transform: [{ scale: popupScale }, { scale: pulseValue }],
            },
          ]}
        >
          <View style={[styles.checkmarkCircle, { backgroundColor: colors.secondary }]}>
            <Image
              source={require('../../assets/images/mascot_reached.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>You&apos;ve Arrived!</Text>

          <Text style={[styles.destination, { color: colors.text }]}>{destination}</Text>

          <Text style={[styles.message, { color: colors.text }]}>
            You have successfully reached your destination.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Great!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10000,
  },
  popupContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10001,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  checkmarkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mascotImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  destination: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DestinationReachedPopup;
