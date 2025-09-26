import { useState, useEffect } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useUserIcons } from '../context/UserIconContext';
import { useBadges } from '../context/BadgeContext';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Define the shape of shop items
export interface ShopItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  tabType: 'Home' | 'Map' | 'Achievements' | 'Settings';
  equipped?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  // Home tab icons
  {
    id: 'home-icon-home',
    title: 'Standard Home',
    description: 'Classic home icon for the Home tab',
    icon: 'home-outline',
    tabType: 'Home',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'home-icon-home-heart',
    title: 'Home Heart',
    description: 'A cozy home icon with a heart',
    icon: 'heart',
    tabType: 'Home',
    cost: 25,
  },
  {
    id: 'home-icon-planet',
    title: 'Planet Home',
    description: 'Earth icon for the Home tab',
    icon: 'planet',
    tabType: 'Home',
    cost: 25,
  },
  {
    id: 'home-icon-home-filled',
    title: 'Solid Home',
    description: 'A solid home icon for a bold look',
    icon: 'home',
    tabType: 'Home',
    cost: 50,
  },
  {
    id: 'home-icon-apps',
    title: 'Apps Grid',
    description: 'A grid of apps for your home screen',
    icon: 'apps',
    tabType: 'Home',
    cost: 50,
  },
  {
    id: 'home-icon-desktop',
    title: 'Desktop',
    description: 'A sleek desktop computer icon',
    icon: 'desktop',
    tabType: 'Home',
    cost: 100,
  },

  // Map tab icons
  {
    id: 'map-icon-map',
    title: 'Standard Map',
    description: 'Classic map icon for the Map tab',
    icon: 'map-outline',
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
    cost: 25,
  },
  {
    id: 'map-icon-globe',
    title: 'Globe',
    description: 'See the world with a globe icon',
    icon: 'globe',
    tabType: 'Map',
    cost: 25,
  },
  {
    id: 'map-icon-navigate',
    title: 'Navigate',
    description: 'A navigation arrow for finding your way',
    icon: 'navigate',
    tabType: 'Map',
    cost: 50,
  },
  {
    id: 'map-icon-location',
    title: 'Location Pin',
    description: 'Mark your spot with a location pin',
    icon: 'location',
    tabType: 'Map',
    cost: 50,
  },
  {
    id: 'map-icon-map-filled',
    title: 'Solid Map',
    description: 'A solid map icon for clear navigation',
    icon: 'map',
    tabType: 'Map',
    cost: 100,
  },

  // Achievements tab icons
  {
    id: 'achievements-icon-trophy',
    title: 'Standard Trophy',
    description: 'Classic trophy icon for achievements',
    icon: 'trophy-outline',
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
    cost: 25,
  },
  {
    id: 'achievements-icon-medal',
    title: 'Medal',
    description: 'Gold medal for achievements tab',
    icon: 'medal',
    tabType: 'Achievements',
    cost: 25,
  },
  {
    id: 'achievements-icon-star',
    title: 'Star',
    description: 'A shining star for your achievements',
    icon: 'star',
    tabType: 'Achievements',
    cost: 50,
  },
  {
    id: 'achievements-icon-trophy-filled',
    title: 'Solid Trophy',
    description: 'A bold, solid trophy icon',
    icon: 'trophy',
    tabType: 'Achievements',
    cost: 50,
  },
  {
    id: 'achievements-icon-sparkles',
    title: 'Sparkles',
    description: 'Celebrate your achievements with sparkles',
    icon: 'sparkles',
    tabType: 'Achievements',
    cost: 100,
  },

  // Settings tab icons
  {
    id: 'settings-icon-settings',
    title: 'Standard Settings',
    description: 'Classic gear icon for settings',
    icon: 'settings-outline',
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
    cost: 25,
  },
  {
    id: 'settings-icon-cog',
    title: 'Fancy Cog',
    description: 'Premium cog icon for the settings tab',
    icon: 'cog',
    tabType: 'Settings',
    cost: 25,
  },
  {
    id: 'settings-icon-construct',
    title: 'Tools',
    description: 'Construction tools for settings',
    icon: 'construct',
    tabType: 'Settings',
    cost: 50,
  },
  {
    id: 'settings-icon-settings-filled',
    title: 'Solid Settings',
    description: 'A bold, solid settings gear icon',
    icon: 'settings',
    tabType: 'Settings',
    cost: 50,
  },
  {
    id: 'settings-icon-build',
    title: 'Build',
    description: 'Wrench icon for adjusting your settings',
    icon: 'build',
    tabType: 'Settings',
    cost: 100,
  },
];

// Popup state type
type PopupState = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: (e?: GestureResponderEvent) => void;
  onCancel?: (e?: GestureResponderEvent) => void;
};

interface UseShopManagerReturn {
  // Data
  shopItems: ShopItem[];
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  
  // State from contexts
  badgeState: ReturnType<typeof useBadges>['state'];
  setBadgeState: ReturnType<typeof useBadges>['setState'];
  equipIcon: ReturnType<typeof useUserIcons>['equipIcon'];
  isItemEquipped: ReturnType<typeof useUserIcons>['isItemEquipped'];
  
  // Popup state
  popup: PopupState;
  setPopup: (popup: PopupState | ((prev: PopupState) => PopupState)) => void;
  
  // Methods
  getFilteredItems: () => ShopItem[];
  handlePurchase: (item: ShopItem) => Promise<void>;
  handleEquipIcon: (item: ShopItem) => Promise<void>;
  isItemOwned: (item: ShopItem) => boolean;
}

export const useShopManager = (): UseShopManagerReturn => {
  const { state: badgeState, setState: setBadgeState } = useBadges();
  const { equipIcon, isItemEquipped } = useUserIcons();
  const [selectedTab, setSelectedTab] = useState<string>('Home'); // Default selected tab

  // Popup state
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
    showCancel: false,
    onConfirm: undefined,
    onCancel: undefined,
  });

  // Load user points and purchases from Firestore on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      try {
        const userRef = firestore().collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          setBadgeState((prev) => ({
            ...prev,
            points: data.points ?? 0,
            purchases: data.purchases ?? [],
          }));
        }
      } catch (err) {
        console.error('Failed to fetch user shop data:', err);
      }
    };
    fetchUserData();
  }, [setBadgeState]);

  // Check if user owns this item (either it's free or they've purchased it)
  const isItemOwned = (item: ShopItem): boolean => {
    return item.cost === 0 || badgeState.purchases?.some((p) => p.id === item.id);
  };

  // Purchase function that updates Firestore and then local state
  const handlePurchase = async (item: ShopItem) => {
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) {
        setPopup({
          visible: true,
          title: 'Not logged in',
          message: 'Please log in to make purchases.',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
          cancelText: '',
          onCancel: undefined,
        });
        return;
      }
      if (badgeState.points < item.cost) {
        setPopup({
          visible: true,
          title: 'Not enough points',
          message: `You need ${item.cost} points to purchase this item.`,
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
          cancelText: '',
          onCancel: undefined,
        });
        return;
      }
      const userRef = firestore().collection('users').doc(uid);
      // Fetch latest user data
      const userDoc = await userRef.get();
      if (!userDoc.exists()) throw new Error('User not found');
      const userData = userDoc.data() || {};
      const prevPoints = userData.points ?? 0;
      const prevPurchases = userData.purchases ?? [];
      // Add new purchase
      const newPurchase = {
        id: item.id,
        title: item.title,
        description: item.description,
        icon: item.icon,
        tabType: item.tabType,
        cost: item.cost,
        equipped: false,
        boughtAt: new Date().toISOString(),
      };
      const updatedPurchases = [...prevPurchases, newPurchase];
      // Update Firestore
      await userRef.update({
        points: prevPoints - item.cost,
        purchases: updatedPurchases,
      });
      // Update local state
      setBadgeState((prev) => ({
        ...prev,
        points: prevPoints - item.cost,
        purchases: updatedPurchases,
      }));
      // Show success popup with option to equip
      setPopup({
        visible: true,
        title: 'Purchase Successful',
        message: `You purchased ${item.title}! Would you like to equip it now?`,
        confirmText: 'Equip',
        cancelText: 'Not Now',
        showCancel: true,
        onConfirm: () => {
          setPopup((p) => ({ ...p, visible: false }));
          handleEquipIcon(item);
        },
        onCancel: () => setPopup((p) => ({ ...p, visible: false })),
      });
    } catch (err) {
      console.error('Purchase error:', err);
      setPopup({
        visible: true,
        title: 'Error',
        message: 'Something went wrong with your purchase.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
        cancelText: '',
        onCancel: undefined,
      });
    }
  };

  // Function to equip an icon for a specific tab
  const handleEquipIcon = async (item: ShopItem) => {
    try {
      await equipIcon(item.tabType, item.icon, item.id);
      setPopup({
        visible: true,
        title: 'Icon Equipped',
        message: `Your new icon for the ${item.tabType} tab is now active!`,
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
        cancelText: '',
        onCancel: undefined,
      });
    } catch (error) {
      console.error('Failed to equip icon:', error);
      setPopup({
        visible: true,
        title: 'Error',
        message: 'Something went wrong while equipping the icon.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
        cancelText: '',
        onCancel: undefined,
      });
    }
  };

  // Filtered shop items based on selected tab
  const getFilteredItems = () => {
    return SHOP_ITEMS.filter((item) => item.tabType === selectedTab);
  };

  return {
    // Data
    shopItems: SHOP_ITEMS,
    selectedTab,
    setSelectedTab,
    
    // State from contexts
    badgeState,
    setBadgeState,
    equipIcon,
    isItemEquipped,
    
    // Popup state
    popup,
    setPopup,
    
    // Methods
    getFilteredItems,
    handlePurchase,
    handleEquipIcon,
    isItemOwned,
  };
};