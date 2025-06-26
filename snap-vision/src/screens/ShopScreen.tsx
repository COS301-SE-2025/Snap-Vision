import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { purchaseItem } from '../api/badgeApi';
import auth from '@react-native-firebase/auth';
import PurchasePopup from '../components/molecules/PurchasePopup'; // Adjust the path as needed

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
    title: 'Flame Arrow',
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
    title: 'Retro Map Skin',
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

  {
    id: 'stealth-arrow',
    title: 'Stealth Arrow',
    description: 'Invisible until fired',
    icon: 'eye-off',
    cost: 180,
  },
  { id: 'ice-arrow', title: 'Ice Arrow', description: 'Freezes targets', icon: 'snow', cost: 160 },
  {
    id: 'lightning-arrow',
    title: 'Lightning Bolt',
    description: 'Shocking strike',
    icon: 'flash-outline',
    cost: 175,
  },
  {
    id: 'golden-arrow',
    title: 'Golden Arrow',
    description: 'Premium gold look',
    icon: 'star',
    cost: 220,
  },
  {
    id: 'laser-pointer',
    title: 'Laser Pointer',
    description: 'Precision targeting',
    icon: 'laser',
    cost: 210,
  },
  {
    id: 'explosive-arrow',
    title: 'Explosive Arrow',
    description: 'Area damage',
    icon: 'bomb',
    cost: 230,
  },
  {
    id: 'shadow-arrow',
    title: 'Shadow Arrow',
    description: 'Silent but deadly',
    icon: 'moon',
    cost: 190,
  },
  {
    id: 'plasma-arrow',
    title: 'Plasma Arrow',
    description: 'Futuristic tech',
    icon: 'ellipse-outline',
    cost: 250,
  },
  {
    id: 'vortex-arrow',
    title: 'Vortex Arrow',
    description: 'Sucks in targets',
    icon: 'git-branch',
    cost: 270,
  },
  {
    id: 'fireworks-arrow',
    title: 'Fireworks Arrow',
    description: 'Spectacular display',
    icon: 'sparkles',
    cost: 140,
  },
  {
    id: 'rainbow-arrow',
    title: 'Rainbow Arrow',
    description: 'Colorful streak',
    icon: 'color-palette',
    cost: 130,
  },
  {
    id: 'phantom-arrow',
    title: 'Phantom Arrow',
    description: 'Ghostly effect',
    icon: 'git-commit',
    cost: 160,
  },
  {
    id: 'electric-arrow',
    title: 'Electric Arrow',
    description: 'Zaps enemies',
    icon: 'zap',
    cost: 200,
  },
  {
    id: 'meteor-arrow',
    title: 'Meteor Arrow',
    description: 'Burns like a meteor',
    icon: 'sunny',
    cost: 240,
  },
  {
    id: 'frost-arrow',
    title: 'Frost Arrow',
    description: 'Chills air on hit',
    icon: 'cloud',
    cost: 170,
  },
];

export default function ShopScreen({ navigation }: { navigation: any }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state, setState } = useBadges();
  const [popupItem, setPopupItem] = useState<{ title: string; cost: number } | null>(null);

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

      setPopupItem({ title: item.title, cost: item.cost });
    } catch (err: any) {
      console.error('Purchase error:', err);
      Alert.alert('Error', err.message || 'Purchase failed');
    }
  };

  const renderItem = ({ item }: { item: (typeof SHOP_ITEMS)[0] }) => {
    const isOwned = state.purchases?.some((p: any) => p.itemId === item.id);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name={item.icon} size={32} color={colors.primary} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.subtleText }]}>{item.description}</Text>
        <TouchableOpacity
          style={[styles.buyButton, { backgroundColor: isOwned ? colors.border : colors.primary }]}
          onPress={() => handlePurchase(item)}
          disabled={state.points < item.cost || isOwned}
        >
          <Text style={styles.buyText}>{isOwned ? 'Owned' : `${item.cost} pts`}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Shop</Text>
        <View style={{ width: 24 }} /> {/* Placeholder */}
      </View>

      <Text style={[styles.subtitle, { color: colors.text }]}>Spend your points wisely!</Text>

      {/* Grid List */}
      <FlatList
        data={SHOP_ITEMS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2} // <-- 2 cards per row; change as needed
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {popupItem && (
        <PurchasePopup
          itemTitle={popupItem.title}
          cost={popupItem.cost}
          onClose={() => setPopupItem(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginBottom: 16 },
  card: {
    flex: 1,
    // width removed to allow flex in FlatList with numColumns
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 8,
  },
  cardIcon: { marginBottom: 8 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  buyButton: {
    marginTop: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buyText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
