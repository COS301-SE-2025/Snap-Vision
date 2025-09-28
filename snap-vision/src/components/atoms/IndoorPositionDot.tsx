import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  x: number; // value between 0 and 1
  y: number; // value between 0 and 1
  containerWidth: number;
  containerHeight: number;
};

export default function IndoorPositionDot({ x, y, containerWidth, containerHeight }: Props) {
  const dotSize = 16;

  const left = x * containerWidth - dotSize / 2;
  const top = y * containerHeight - dotSize / 2;

  return (
    <View
      style={[
        styles.dot,
        {
          left,
          top,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'dodgerblue',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
