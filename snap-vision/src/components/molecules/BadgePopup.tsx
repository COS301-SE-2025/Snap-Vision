import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BadgeId, BADGES } from '../../types/badges';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface BadgePopupProps {
  badgeId: BadgeId;
  onClose: () => void;
}

export default function BadgePopup({ badgeId, onClose }: BadgePopupProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onClose());
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, onClose]);

  const badge = BADGES[badgeId];

 