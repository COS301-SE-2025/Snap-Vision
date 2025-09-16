import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { purchaseItemForUser } from '../services/badgeService';
import auth from '@react-native-firebase/auth';
import PurchasePopup from '../components/molecules/PurchasePopup';
import SettingsHeader from '../components/molecules/SettingsHeader';
import StandardPopup from '../components/atoms/StandardPopup';

// Define the shape of shop items
export interface ShopItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
}

const SHOP_ITEMS: ShopItem[] = [
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
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState('');

  const handlePurchase = async (item: ShopItem) => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      setErrorPopupMessage('Not logged in');
      setShowErrorPopup(true);
      return;
    }

    if (state.points < item.cost) {
      setErrorPopupMessage(`You need ${item.cost} points.`);
      setShowErrorPopup(true);
      return;
    }

    try {
      const updatedData = await purchaseItemForUser(uid, {
        itemId: item.id,
        name: item.title,
        type: 'shop',
        cost: item.cost,
      });

      setState((prev) => ({
        ...prev,
        points: updatedData?.points ?? prev.points,
        purchases: updatedData?.purchases ?? prev.purchases,
      }));

      setPopupItem({ title: item.title, cost: item.cost });
    } catch (err: any) {
      //consoleerror('Purchase error:', err);
      setErrorPopupMessage(err.message || 'Purchase failed');
      setShowErrorPopup(true);
    }
  };

  const renderItem = ({ item }: { item: ShopItem }) => {
    const isOwned = state.purchases?.some((p) => p.itemId === item.id);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name={item.icon} size={32} color={colors.primary} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.subtleText }]}>{item.description}</Text>
        <TouchableOpacity
          style={[styles.buyButton, { backgroundColor: isOwned ? colors.border : colors.primary }]}
          onPress={() => handlePurchase(item)}
          disabled={isOwned}
        >
          <Text style={styles.buyText}>{isOwned ? 'Owned' : `${item.cost} pts`}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Shop" />
      <Text style={[styles.subtitle, { color: colors.text }]}>Spend your points wisely!</Text>

      <FlatList
        data={SHOP_ITEMS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
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

      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorPopupMessage}
        onConfirm={() => setShowErrorPopup(false)}
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
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
