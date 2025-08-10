// src/components/molecules/StepsBottomSheet.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { NavigationStep } from '../../utils/navigationUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCancel?: () => void; // NEW
  onAdvance?: () => void;
  steps: NavigationStep[];
  colors: any;
  currentStep?: number;
}

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.min(420, SCREEN_H * 0.55);

export default function StepsBottomSheet({
  visible,
  onClose,
  onCancel,
  onAdvance,
  steps,
  colors,
  currentStep = 0,
}: Props) {
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SHEET_H,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(Math.min(SHEET_H, g.dy));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > SHEET_H * 0.4) onClose();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const total = steps.length;
  const remaining = Math.max(0, total - currentStep);

  // Hide tiny/undefined distances to avoid "0 m"
  const displayDistance = (s: NavigationStep, next?: NavigationStep) => {
    const d = typeof s.distance === 'number' ? s.distance : undefined;
    const raw =
      d ??
      (next
        ? Math.sqrt(
            Math.pow(next.coordinates.x - s.coordinates.x, 2) +
              Math.pow(next.coordinates.y - s.coordinates.y, 2),
          )
        : undefined);
    if (!raw || raw < 0.1) return null; // hide very small/undefined
    // If your coords are normalized, this is "relative meters".
    return `${Math.round(raw)} m`;
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [{ translateY }],
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      {...pan.panHandlers}
    >
      <View style={styles.grabber} />

      {/* Header with actions */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Directions {total > 0 ? `• ${remaining} left` : ''}
        </Text>
        <View style={styles.headerActions}>
          {!!onCancel && total > 0 && (
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.headerBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.headerBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.list}>
        {steps.map((s, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const next = steps[i + 1];
          const distanceText = displayDistance(s, next);

          return (
            <View
              key={i}
              style={[
                styles.item,
                {
                  borderColor: colors.border,
                  backgroundColor: isCurrent ? colors.primary + '22' : 'transparent',
                  opacity: isDone ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.instruction, { color: colors.text }]}>
                {isDone ? '✅ ' : isCurrent ? '👉 ' : '• '} {s.instruction}
              </Text>
              {distanceText && (
                <Text style={[styles.meta, { color: colors.secondary }]}>{distanceText}</Text>
              )}

              {isCurrent && onAdvance && (
                <TouchableOpacity
                  onPress={onAdvance}
                  style={[styles.advanceBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.advanceText}>
                    {i === total - 1 ? "I've arrived" : 'Mark step done'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {steps.length === 0 && (
          <Text style={{ color: colors.secondary, padding: 12 }}>
            Select a start and destination on the map.
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_H,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 8,
  },
  grabber: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#999',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  list: { flex: 1, paddingHorizontal: 12 },
  item: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  instruction: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 4 },
  advanceBtn: { marginTop: 8, padding: 10, borderRadius: 8, alignItems: 'center' },
  advanceText: { color: '#fff', fontWeight: '700' },
});
