import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, Alert, SectionList, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUserIcons } from '../context/UserIconContext';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { purchaseItemForUser } from '../services/badgeService';
import auth from '@react-native-firebase/auth';
import PurchasePopup from '../components/molecules/PurchasePopup';
import SettingsHeader from '../components/molecules/SettingsHeader';
import StandardPopup from '../components/atoms/StandardPopup';
import { useNavigation } from '@react-navigation/native';

// Define the shape of shop items
export interface ShopItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  tabType: 'Home' | 'Map' | 'Achievements' | 'Settings' | 'Admin' | 'Editor';
  equipped?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  // Home tab icons
  {
    id: 'home-icon-home',
    title: 'Standard Home',
    description: 'Classic home icon for the Home tab',
    icon: 'home',
    tabType: 'Home',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'home-icon-home-heart',
    title: 'Home Heart',
    description: 'A cozy home icon with a heart',
    icon: 'heart-circle',
    tabType: 'Home',
    cost: 10,
  },
  {
    id: 'home-icon-planet',
    title: 'Planet Home',
    description: 'Earth icon for the Home tab',
    icon: 'planet',
    tabType: 'Home',
    cost: 150,
  },
  
  // Map tab icons
  {
    id: 'map-icon-map',
    title: 'Standard Map',
    description: 'Classic map icon for the Map tab',
    icon: 'map',
    tabType: 'Map',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'map-icon-compass',
    title: 'Compass',
    description: 'Navigate with a classic compass icon',
    icon: 'compass',
    tabType: 'Map',
    cost: 150,
  },
  {
    id: 'map-icon-globe',
    title: 'Globe',
    description: 'See the world with a globe icon',
    icon: 'globe',
    tabType: 'Map',
    cost: 200,
  },
  
  // Achievements tab icons
  {
    id: 'achievements-icon-trophy',
    title: 'Standard Trophy',
    description: 'Classic trophy icon for achievements',
    icon: 'trophy',
    tabType: 'Achievements',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'achievements-icon-ribbon',
    title: 'Ribbon',
    description: 'Award ribbon for your accomplishments',
    icon: 'ribbon',
    tabType: 'Achievements',
    cost: 120,
  },
  {
    id: 'achievements-icon-medal',
    title: 'Medal',
    description: 'Gold medal for achievements tab',
    icon: 'medal',
    tabType: 'Achievements',
    cost: 180,
  },
  
  // Settings tab icons
  {
    id: 'settings-icon-settings',
    title: 'Standard Settings',
    description: 'Classic gear icon for settings',
    icon: 'settings',
    tabType: 'Settings',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'settings-icon-options',
    title: 'Options',
    description: 'Options icon for the settings tab',
    icon: 'options',
    tabType: 'Settings',
    cost: 100,
  },
  {
    id: 'settings-icon-cog',
    title: 'Fancy Cog',
    description: 'Premium cog icon for the settings tab',
    icon: 'cog',
    tabType: 'Settings',
    cost: 150,
  },
  
  // Admin tab icons (visible to admins only)
  {
    id: 'admin-icon-shield',
    title: 'Standard Admin',
    description: 'Classic shield icon for admin tab',
    icon: 'shield',
    tabType: 'Admin',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'admin-icon-key',
    title: 'Admin Key',
    description: 'Key icon for the admin tab',
    icon: 'key',
    tabType: 'Admin',
    cost: 250,
  },
  
  // Editor tab icons (visible to editors only)
  {
    id: 'editor-icon-pencil',
    title: 'Standard Editor',
    description: 'Classic pencil icon for editor tab',
    icon: 'pencil',
    tabType: 'Editor',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'editor-icon-brush',
    title: 'Artist Brush',
    description: 'Brush icon for the editor tab',
    icon: 'brush',
    tabType: 'Editor',
    cost: 200,
  },
];

export default function ShopScreen() {
  // Navigation
  const navigation = useNavigation();
  
  // Theme and state
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { state, setState } = useBadges();
  const { equipIcon, isItemEquipped } = useUserIcons();
  const [selectedTab, setSelectedTab] = useState<string>('Home'); // Default selected tab
  
  // Debug logging
  useEffect(() => {
    console.log('Shop screen rendered');
    console.log(`Available points: ${state.points}`);
    console.log(`Purchases: ${state.purchases?.length || 0}`);
  }, []);
  
  // Ultra-simplified purchase function - no external calls at all
  const handlePurchase = (item: ShopItem) => {
    try {
      // Check if user has enough points (no need to check login since it's just local state)
      if (state.points < item.cost) {
        Alert.alert('Not enough points', `You need ${item.cost} points.`);
        return;
      }
      
      console.log(`Purchasing ${item.title}`);
      
      // Just update state directly
      setState(prev => ({
        ...prev,
        // Reduce points
        points: prev.points - item.cost,
        // Add to purchases
        purchases: [
          ...(prev.purchases || []),
          {
            itemId: item.id,
            name: item.title,
            type: 'shop',
            cost: item.cost,
            boughtAt: new Date().toISOString()
          }
        ]
      }));
      
      // Show success alert
      Alert.alert(
        'Purchase Successful', 
        `You purchased ${item.title}! Would you like to equip it now?`,
        [
          { text: 'Not Now' },
          { 
            text: 'Equip', 
            onPress: () => handleEquipIcon(item),
          },
        ]
      );
    } catch (err) {
      // If anything fails, just show an alert
      console.error('Purchase error:', err);
      Alert.alert('Error', 'Something went wrong with your purchase.');
    }
  };

  // Function to equip an icon for a specific tab
  const handleEquipIcon = async (item: ShopItem) => {
    try {
      await equipIcon(item.tabType, item.icon, item.id);
      Alert.alert('Icon Equipped', `Your new icon for the ${item.tabType} tab is now active!`);
    } catch (error) {
      console.error('Failed to equip icon:', error);
      Alert.alert('Error', 'Something went wrong while equipping the icon.');
    }
  };

  // Filtered shop items based on selected tab
  const getFilteredItems = () => {
    return SHOP_ITEMS.filter(item => item.tabType === selectedTab);
  };

  // Render function for shop items
  const renderItem = ({ item }: { item: ShopItem }) => {
    // Check if user owns this item
    const isOwned = state.purchases?.some(p => p.itemId === item.id) || item.cost === 0;
    
    // Check if this icon is currently equipped
    const isEquipped = isItemEquipped(item.id);
    
    // Use a safe default icon if needed
    const iconName = item.icon || 'help-circle';
    
    return (
      <View style={[styles.card, { 
        backgroundColor: colors.card, 
        borderColor: isEquipped ? colors.primary : colors.border,
        borderWidth: isEquipped ? 2 : 1,
      }]}>
        <Icon name={iconName} size={32} color={colors.primary} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.subtleText }]}>{item.description}</Text>
        
        {isOwned ? (
          <TouchableOpacity
            style={[styles.buyButton, { 
              backgroundColor: isEquipped ? colors.secondary : colors.primary 
            }]}
            onPress={() => handleEquipIcon(item)}
          >
            <Text style={styles.buyText}>{isEquipped ? 'Equipped' : 'Equip'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.buyButton, { backgroundColor: colors.primary }]}
            onPress={() => handlePurchase(item)}
          >
            <Text style={styles.buyText}>{`${item.cost} pts`}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render a tab button in the horizontal tab selector
  const renderTabButton = (tabName: string) => {
    const isSelected = selectedTab === tabName;
    return (
      <TouchableOpacity
        key={tabName}
        style={[
          styles.tabButton,
          { 
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          }
        ]}
        onPress={() => setSelectedTab(tabName)}
      >
        <Text style={[styles.tabText, { color: isSelected ? 'white' : colors.text }]}>
          {tabName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Icon Shop" />
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Customize your navigation tabs with different icons!
      </Text>

      {/* Tab selector */}
      <View style={styles.tabSelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabSelectorContent}
        >
          {['Home', 'Map', 'Achievements', 'Settings', 'Admin', 'Editor'].map(renderTabButton)}
        </ScrollView>
      </View>

      {/* Available points display */}
      <View style={[styles.pointsContainer, { backgroundColor: colors.card }]}>
        <Icon name="wallet-outline" size={16} color={colors.primary} style={styles.pointsIcon} />
        <Text style={[styles.pointsText, { color: colors.text }]}>
          {state.points} points available
        </Text>
      </View>

      <FlatList
        data={getFilteredItems()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  tabSelector: {
    marginBottom: 16,
  },
  tabSelectorContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  pointsIcon: {
    marginRight: 6,
  },
  pointsText: {
    fontWeight: '600',
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
    marginBottom: 8,
  },
  cardIcon: { marginBottom: 8 },
  cardTitle: {
    fontSize: 14,
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
    width: '100%',
    alignItems: 'center',
  },
  buyText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
