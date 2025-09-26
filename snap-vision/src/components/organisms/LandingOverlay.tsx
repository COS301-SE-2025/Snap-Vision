import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const LandingOverlay = ({ onDismiss }: { onDismiss: () => void }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const bg = colors.background;

  const swappedTextColor = colors.primary;
  const swappedAccentColor = colors.text;

  const snapAnim1 = useRef(new Animated.Value(0)).current;
  const snapAnim2 = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(300, [
      Animated.spring(snapAnim1, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 150,
        damping: 8,
      }),
      Animated.spring(snapAnim2, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 150,
        damping: 8,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <View style={[styles.overlay, { backgroundColor: bg }]}>
        <View style={styles.mascotWrapper} pointerEvents="none">
          <Image
            source={require('../../assets/images/mascot_welcome.png')}
            style={styles.mascotImage}
            accessibilityIgnoresInvertColors
          />
        </View>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.snapTitleRow}>
            <Animated.Text
              style={[
                styles.snapTitle,
                {
                  color: swappedTextColor,
                  fontFamily: 'ChicleRegular',
                  transform: [
                    {
                      scale: snapAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                    { rotate: '-2deg' },
                  ],
                  opacity: snapAnim1,
                },
              ]}
            >
              Snap
            </Animated.Text>

            <Animated.Text
              style={[
                styles.snapTitle,
                {
                  color: swappedTextColor,
                  fontFamily: 'ChicleRegular',
                  includeFontPadding: false,
                  marginLeft: 1,
                  transform: [
                    {
                      scale: snapAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                    { rotate: '2deg' },
                  ],
                  opacity: snapAnim2,
                },
              ]}
            >
              {' Vision'}
            </Animated.Text>
          </View>

          {/* <Text style={[styles.tagline, { color: swappedAccentColor, fontFamily: 'ChicleRegular' }]}>
            Wander Less, Discover More
          </Text> */}

          {/* <Text style={[styles.description, { color: swappedTextColor }]}>
            Snap Vision is an indoor and outdoor navigation system designed to help students and
            visitors find their way around university spaces. Our mission is to make every step
            intuitive, accessible, and fast — whether you’re locating a lecture hall or the nearest
            exit.
          </Text> */}

          <View style={styles.featureSection}>
            <MaskedView
              maskElement={
                <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: 'black' }]}>Key Features</Text>
                </View>
              }
            >
              <Animated.View
                style={{
                  height: 40,
                  width: 600, // Wider than mask so it can scroll across
                  transform: [{ translateX: shimmerTranslate }],
                }}
              >
                <LinearGradient
                  colors={[colors.text, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </MaskedView>

            {[
              'Indoor and Outdoor Navigation',
              'AR Mode',
              'Earn Badges and Shop Icons!',
              'Integrated Timetable Builder',
            ].map((feature, index) => (
              <View key={index} style={[styles.featureBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.featureText, { color: colors.primary }]}>{feature}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.footer, { color: swappedAccentColor }]}>
            © 2025 Snap Vision Team
          </Text>
        </ScrollView>

        <View style={styles.getStartedRow} pointerEvents="none">
          <Text style={[styles.getStartedText, { color: colors.text }]}>
            Hi, I am Snaps, tap to get started!
          </Text>
          {/* <Text style={[styles.getStartedText, { color: swappedAccentColor }]}>Tap to Get Started!</Text> */}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingBottom: 0, // leave room for mascot and absolute footer
  },
  mascotWrapper: {
    position: 'absolute',
    right: -40,
    bottom: 0,
    width: 300,
    height: 300,
    zIndex: 20,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  snapTitleRow: {
    flexDirection: 'row',
    marginTop: -100,
    marginBottom: 10,
  },
  snapTitle: {
    fontSize: 62,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 20,
    fontFamily: 'ChicleRegular',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  featureSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureBox: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#ffffff10',
    borderRadius: 12,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90AFA8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 2,
  },
  featureText: {
    fontSize: 16,
  },
  getStartedRow: {
    width: '80%',
    alignItems: 'center',
    paddingRight: 180,
    marginBottom: 0,
    left: 60,
    bottom: 145,
  },
  getStartedText: {
    fontSize: 22,
    fontWeight: '400',
    fontFamily: 'ChicleRegular',
  },
  footer: {
    fontSize: 12,
    marginTop: 0,

    bottom: -120,
    right: 80,
    textAlign: 'right',
    position: 'relative',
  },
});

export default LandingOverlay;
