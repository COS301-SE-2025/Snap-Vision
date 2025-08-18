import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Easing, Dimensions, ViewStyle } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
}

interface ConfettiProps {
  count?: number;
  duration?: number;
  colors?: string[];
  size?: number;
  style?: ViewStyle;
  active?: boolean;
  onComplete?: () => void;
}

const Confetti: React.FC<ConfettiProps> = ({
  count = 80, // Increased from 50 to 80
  duration = 5000,
  colors = [
    '#FF577F',
    '#FF884B',
    '#FFCF0D',
    '#90E0EF',
    '#4361EE',
    '#6A0572',
    '#FFD700',
    '#00FF00',
    '#FF00FF',
    '#FF5733',
  ], // More colors
  size = 15, // Increased from 12 to 15
  style,
  active = false,
  onComplete,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const animationsComplete = useRef(0);
  const animationsStarted = useRef(false);

  // Create confetti pieces
  useEffect(() => {
    if (active && !animationsStarted.current) {
      animationsStarted.current = true;
      animationsComplete.current = 0;
      const newPieces: ConfettiPiece[] = Array(count)
        .fill(0)
        .map((_, i) => {
          const shape = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as
            | 'circle'
            | 'square'
            | 'triangle';
          return {
            id: i,
            x: new Animated.Value(Math.random() * SCREEN_WIDTH * 0.8 + SCREEN_WIDTH * 0.1),
            y: new Animated.Value(-size * 2),
            rotate: new Animated.Value(0),
            scale: new Animated.Value(Math.random() * 0.4 + 0.8),
            color: colors[Math.floor(Math.random() * colors.length)],
            shape,
          };
        });
      setPieces(newPieces);
    } else if (!active && pieces.length > 0) {
      setPieces([]);
      animationsStarted.current = false;
    }
  }, [active, count, colors, size]);

  // Animate pieces
  useEffect(() => {
    if (pieces.length === 0) return;

    const animations = pieces.map((piece, index) => {
      // Randomize animation parameters
      const delay = Math.random() * 1000;
      const fallDuration = duration * (0.7 + Math.random() * 0.3);
      const endX = piece.x._value + (Math.random() * 200 - 100);

      // Create animation sequences
      const fallAnimation = Animated.timing(piece.y, {
        toValue: SCREEN_HEIGHT + size * 2,
        duration: fallDuration,
        delay,
        easing: Easing.bezier(0.1, 1, 0.3, 1),
        useNativeDriver: true,
      });

      // Make the drift more pronounced
      const driftAnimation = Animated.timing(piece.x, {
        toValue: endX,
        duration: fallDuration,
        delay,
        easing: Easing.bezier(0.1, 0.5, 0.3, 1),
        useNativeDriver: true,
      });

      // More dramatic rotation
      const rotateAnimation = Animated.timing(piece.rotate, {
        toValue: Math.random() * 20 - 10, // Random rotation -10 to 10 (more dramatic)
        duration: fallDuration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      return Animated.parallel([fallAnimation, driftAnimation, rotateAnimation]);
    });

    // Start all animations
    animations.forEach((animation, index) => {
      animation.start(({ finished }) => {
        if (finished) {
          animationsComplete.current += 1;
          if (animationsComplete.current === pieces.length && onComplete) {
            onComplete();
            animationsStarted.current = false;
          }
        }
      });
    });

    // Cleanup
    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [pieces, duration, size, onComplete]);

  // Render individual confetti pieces
  const renderConfettiPiece = (piece: ConfettiPiece) => {
    const transform = [
      { translateX: piece.x },
      { translateY: piece.y },
      {
        rotate: piece.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
      { scale: piece.scale },
    ];

    let shapeStyle = {};
    if (piece.shape === 'circle') {
      shapeStyle = { borderRadius: size };
    } else if (piece.shape === 'triangle') {
      return (
        <Animated.View
          key={piece.id}
          style={[
            styles.piece,
            {
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderLeftWidth: size / 2,
              borderRightWidth: size / 2,
              borderBottomWidth: size,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: piece.color,
              transform,
            },
          ]}
        />
      );
    }

    return (
      <Animated.View
        key={piece.id}
        style={[
          styles.piece,
          {
            width: size,
            height: size,
            backgroundColor: piece.color,
            transform,
            ...shapeStyle,
          },
        ]}
      />
    );
  };

  if (!active && pieces.length === 0) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {pieces.map(renderConfettiPiece)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // Increased z-index to make sure it appears above everything
  },
  piece: {
    position: 'absolute',
  },
});

export default Confetti;
