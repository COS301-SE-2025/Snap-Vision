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
    id: 'user-icon-star',
    title: 'Star Location Marker',
    description: 'Display your location with a shining star',
    icon: 'star',
    cost: 150,
  },
  {
    id: 'user-icon-heart',
    title: 'Heart Location Marker',
    description: 'Show your location with a loving heart',
    icon: 'heart',
    cost: 150,
  },
  {
    id: 'user-icon-compass',
    title: 'Compass Location Marker',
    description: 'Navigate with a classic compass',
    icon: 'compass',
    cost: 50,
  },
  {
    id: 'user-icon-rocket',
    title: 'Rocket Location Marker',
    description: 'Blast off with a rocket icon',
    icon: 'rocket',
    cost: 50,
  },
  {
    id: 'user-icon-gem',
    title: 'Gem Location Marker',
    description: 'Sparkle with a precious gem',
    icon: 'diamond',
    cost: 10,
  },
  {
    id: 'user-icon-crown',
    title: 'Crown Location Marker',
    description: 'Rule the map with a royal crown',
    icon: 'crown',
    cost: 10,
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
        id: item.id,
        name: item.title,
        type: 'shop',
        cost: item.cost,
      });

      // Update state with new points and purchases
      setState((prev) => ({
        ...prev,
        points: updatedData?.points ?? prev.points,
        purchases: updatedData?.purchases ?? prev.purchases,
      }));

      setPopupItem({ title: item.title, cost: item.cost });
    } catch (err: any) {
      console.error('Purchase error:', err);
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
