import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface PurchasePopupProps {
  itemTitle: string;
  cost: number;
  onClose: () => void;
}

export default function PurchasePopup({ itemTitle, cost, onClose }: PurchasePopupProps) {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
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

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.popup, { backgroundColor: colors.card }]}>
        <Icon name="cart-outline" size={32} color={colors.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>Purchase Successful!</Text>
          <Text style={[styles.badgeTitle, { color: colors.text }]}>{itemTitle}</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>Cost: {cost} points</Text>
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
    top: '40%',
    left: 30,
    right: 30,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  popup: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  badgeTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    marginLeft: 12,
  },
  closeText: {
    fontSize: 20,
  },
});
