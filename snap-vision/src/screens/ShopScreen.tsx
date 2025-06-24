// src/screens/ShopScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { purchaseItem } from '../api/badgeApi'; // ← make sure this is imported
import auth from '@react-native-firebase/auth'; // or however you get current UID

const SHOP_ITEMS = [
  {
    id: 'arrow-classic',
    title: 'Classic Arrow',
    description: 'Standard AR direction arrow',
    icon: 'arrow-forward',
    cost: 50,
  },
  {
    id: 'arrow-flame',
    title: 'Flame Arrow 🔥',
    description: 'Burning animated arrow',
    icon: 'flame',
    cost: 100,
  },
  {
    id: 'arrow-neon',
    title: 'Neon Pulse',
    description: 'Cool glowing arrow',
    icon: 'flash',
    cost: 150,
  },
  {
    id: 'retro-map',
    title: 'Retro Map Skin 🎮',
    description: '8-bit nostalgic overlay',
    icon: 'game-controller',
    cost: 120,
  },
  {
    id: 'double-points',
    title: 'Double Points',
    description: 'Earn double points for next route',
    icon: 'rocket',
    cost: 200,
  },
];

export default function ShopScreen({ navigation }: { navigation: any }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state, setState } = useBadges();

  const handlePurchase = async (item: any) => {
  const uid = auth().currentUser?.uid;
  if (!uid) return Alert.alert('Not logged in');

  if (state.points < item.cost) {
    return Alert.alert('Not enough points', `You need ${item.cost} points.`);
  }

  try {
    const updatedData = await purchaseItem(uid, {
      itemId: item.id,
      name: item.title,
      type: 'shop',
      cost: item.cost,
    });

    setState((prev: any) => ({
      ...prev,
      points: updatedData.points,
      purchases: updatedData.purchases,
    }));

    Alert.alert('Purchase Confirmed', `You bought: ${item.title}`);
  } catch (err: any) {
    console.error('Purchase error:', err);
    Alert.alert('Error', err.message || 'Purchase failed');
  }
};


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Shop</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>Spend your points wisely!</Text>

      <FlatList
        data={SHOP_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: colors.card }]}>
            <Icon name={item.icon} size={28} color={colors.primary} style={styles.icon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.itemDesc, { color: colors.subtleText }]}>{item.description}</Text>
            </View>
            <TouchableOpacity
              style={[styles.buyButton, { backgroundColor: colors.primary }]}
              onPress={() => handlePurchase(item)}
              disabled={state.points < item.cost}
            >
              <Text style={styles.buyText}>{item.cost} pts</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  item: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: { marginRight: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemDesc: { fontSize: 12 },
  buyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buyText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
