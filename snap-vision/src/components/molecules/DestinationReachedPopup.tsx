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
} from 'react-native';
import Confetti from './Confetti';

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

        // Start the pulsing animation
        // startPulseAnimation();
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
    console.log('Confetti animation completed');
  };

  // Debug logging for visibility issues
  useEffect(() => {
    console.log('Popup visibility changed:', visible);
    if (visible) {
      console.log('Showing popup with confetti animation');
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true} // Cover the status bar too
    >
      <View style={styles.modalContainer}>
        <Confetti
          active={showConfetti}
          count={100}
          onComplete={handleConfettiComplete}
          colors={[
            '#FF577F',
            '#FF884B',
            '#FFCF0D',
            '#4361EE',
            themeColors.success,
            themeColors.primary,
          ]}
        />

        <Animated.View
          style={[
            styles.popupContainer,
            {
              backgroundColor: themeColors.background,
              transform: [{ scale: popupScale }, { scale: pulseValue }],
            },
          ]}
        >
          <View style={[styles.checkmarkCircle, { backgroundColor: themeColors.success }]}>
            <Text style={styles.checkmark}>✓</Text>
          </View>

          <Text style={[styles.title, { color: themeColors.text }]}>You&apos;ve Arrived!</Text>

          <Text style={[styles.destination, { color: themeColors.text }]}>{destination}</Text>

          <Text style={[styles.message, { color: themeColors.text }]}>
            You have successfully reached your destination.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.primary }]}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darker backdrop for better contrast
    zIndex: 10000, // Very high z-index
  },
  popupContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10, // Higher elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10001, // Even higher z-index than container
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle border
  },
  checkmarkCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmark: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
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
