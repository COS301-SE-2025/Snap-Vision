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

  return (
     <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.popup, { backgroundColor: colors.card }]}>
        <Icon name="medal-outline" size={32} color={colors.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>Badge Unlocked!</Text>
          <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>{badge.description}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.subtleText }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
 
