import { useState, useEffect } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useUserIcons } from '../context/UserIconContext';
import { useBadges } from '../context/BadgeContext';
import { useTheme } from '../theme/ThemeContext';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import { ThemeName, BaseTheme } from '../theme';

// Define the shape of shop items
export interface ShopItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  itemType: 'icon' | 'theme';
  tabType?: 'Home' | 'Map' | 'Achievements' | 'Settings'; // For icons
  baseThemeType?: BaseTheme; // For themes - now using base themes
  equipped?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  // Theme items - now using base themes
  {
    id: 'theme-light',
    title: 'Classic Theme',
    description: 'Classic light/dark theme with warm colors',
    icon: 'sunny-outline',
    itemType: 'theme',
    baseThemeType: 'light',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'theme-pink',
    title: 'Pink Theme',
    description: 'Beautiful pink theme with light and dark modes',
    icon: 'heart-outline',
    itemType: 'theme',
    baseThemeType: 'pink',
    cost: 20,
  },
  {
    id: 'theme-ocean',
    title: 'Ocean Theme',
    description: 'Refreshing blue ocean theme with light and dark modes',
    icon: 'water-outline',
    itemType: 'theme',
    baseThemeType: 'ocean',
    cost: 20,
  },
  {
    id: 'theme-forest',
    title: 'Forest Theme',
    description: 'Natural green forest theme with light and dark modes',
    icon: 'leaf-outline',
    itemType: 'theme',
    baseThemeType: 'forest',
    cost: 20,
  },

  // Home tab icons
  {
    id: 'home-icon-home',
    title: 'Standard Home Icon',
    description: 'Classic home icon for the Home tab',
    icon: 'home-outline',
    itemType: 'icon',
    tabType: 'Home',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'home-icon-home-heart',
    title: 'Home Heart Icon',
    description: 'A cozy home icon with a heart',
    icon: 'heart',
    itemType: 'icon',
    tabType: 'Home',
    cost: 10,
  },
  {
    id: 'home-icon-planet',
    title: 'Planet Home Icon',
    description: 'Earth icon for the Home tab',
    icon: 'planet',
    itemType: 'icon',
    tabType: 'Home',
    cost: 10,
  },
  {
    id: 'home-icon-home-filled',
    title: 'Solid Home Icon',
    description: 'A solid home icon for a bold look',
    icon: 'home',
    itemType: 'icon',
    tabType: 'Home',
    cost: 10,
  },
  {
    id: 'home-icon-apps',
    title: 'Apps Grid Icon',
    description: 'A grid of apps for your home screen',
    icon: 'apps',
    itemType: 'icon',
    tabType: 'Home',
    cost: 10,
  },
  {
    id: 'home-icon-desktop',
    title: 'Desktop Icon',
    description: 'A sleek desktop computer icon',
    icon: 'desktop',
    itemType: 'icon',
    tabType: 'Home',
    cost: 10,
  },

  // Map tab icons
  {
    id: 'map-icon-map',
    title: 'Standard Map Icon',
    description: 'Classic map icon for the Map tab',
    icon: 'map-outline',
    itemType: 'icon',
    tabType: 'Map',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'map-icon-compass',
    title: 'Compass Icon',
    description: 'Navigate with a classic compass icon',
    icon: 'compass',
    itemType: 'icon',
    tabType: 'Map',
    cost: 10,
  },
  {
    id: 'map-icon-globe',
    title: 'Globe Icon',
    description: 'See the world with a globe icon',
    icon: 'globe',
    itemType: 'icon',
    tabType: 'Map',
    cost: 10,
  },
  {
    id: 'map-icon-navigate',
    title: 'Navigate Icon',
    description: 'A navigation arrow for finding your way',
    icon: 'navigate',
    itemType: 'icon',
    tabType: 'Map',
    cost: 10,
  },
  {
    id: 'map-icon-location',
    title: 'Location Pin Icon',
    description: 'Mark your spot with a location pin',
    icon: 'location',
    itemType: 'icon',
    tabType: 'Map',
    cost: 10,
  },
  {
    id: 'map-icon-map-filled',
    title: 'Solid Map Icon',
    description: 'A solid map icon for clear navigation',
    icon: 'map',
    itemType: 'icon',
    tabType: 'Map',
    cost: 10,
  },

  // Achievements tab icons
  {
    id: 'achievements-icon-trophy',
    title: 'Standard Trophy Icon',
    description: 'Classic trophy icon for achievements',
    icon: 'trophy-outline',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'achievements-icon-ribbon',
    title: 'Ribbon Icon',
    description: 'Award ribbon for your accomplishments',
    icon: 'ribbon',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 10,
  },
  {
    id: 'achievements-icon-medal',
    title: 'Medal Icon',
    description: 'Gold medal for achievements tab',
    icon: 'medal',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 10,
  },
  {
    id: 'achievements-icon-star',
    title: 'Star Icon',
    description: 'A shining star for your achievements',
    icon: 'star',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 10,
  },
  {
    id: 'achievements-icon-trophy-filled',
    title: 'Solid Trophy Icon',
    description: 'A bold, solid trophy icon',
    icon: 'trophy',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 10,
  },
  {
    id: 'achievements-icon-sparkles',
    title: 'Sparkles Icon',
    description: 'Celebrate your achievements with sparkles',
    icon: 'sparkles',
    itemType: 'icon',
    tabType: 'Achievements',
    cost: 10,
  },

  // Settings tab icons
  {
    id: 'settings-icon-settings',
    title: 'Standard Settings Icon',
    description: 'Classic gear icon for settings',
    icon: 'settings-outline',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 0, // Free (default)
    equipped: true,
  },
  {
    id: 'settings-icon-options',
    title: 'Options Icon',
    description: 'Options icon for the settings tab',
    icon: 'options',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 10,
  },
  {
    id: 'settings-icon-cog',
    title: 'Fancy Cog Icon',
    description: 'Premium cog icon for the settings tab',
    icon: 'cog',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 10,
  },
  {
    id: 'settings-icon-construct',
    title: 'Tools Icon',
    description: 'Construction tools for settings',
    icon: 'construct',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 10,
  },
  {
    id: 'settings-icon-settings-filled',
    title: 'Solid Settings Icon',
    description: 'A bold, solid settings gear icon',
    icon: 'settings',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 10,
  },
  {
    id: 'settings-icon-build',
    title: 'Build Icon',
    description: 'Wrench icon for adjusting your settings',
    icon: 'build',
    itemType: 'icon',
    tabType: 'Settings',
    cost: 10,
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
  theme: ThemeName;
  setTheme: (themeName: ThemeName) => void;

  // Popup state
  popup: PopupState;
  setPopup: (popup: PopupState | ((prev: PopupState) => PopupState)) => void;

  // Methods
  getFilteredItems: () => ShopItem[];
  handlePurchase: (item: ShopItem) => Promise<void>;
  handleEquipItem: (item: ShopItem) => Promise<void>;
  isItemOwned: (item: ShopItem) => boolean;
  isThemeEquipped: (baseThemeType: BaseTheme) => boolean;
}

export const useShopManager = (): UseShopManagerReturn => {
  const { state: badgeState, setState: setBadgeState } = useBadges();
  const { equipIcon, isItemEquipped } = useUserIcons();
  const { theme, baseTheme, setBaseTheme, setTheme } = useTheme();
  const [selectedTab, setSelectedTab] = useState<string>('Themes'); // Default to Themes to show new functionality

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
        //console.error('Failed to fetch user shop data:', err);
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
      const newPurchase: any = {
        id: item.id,
        title: item.title,
        description: item.description,
        icon: item.icon,
        itemType: item.itemType,
        cost: item.cost,
        equipped: false,
        boughtAt: new Date().toISOString(),
      };

      // Only add fields that are defined to avoid Firestore undefined errors
      if (item.tabType) {
        newPurchase.tabType = item.tabType;
      }
      if (item.baseThemeType) {
        newPurchase.baseThemeType = item.baseThemeType;
      }
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
          handleEquipItem(item);
        },
        onCancel: () => setPopup((p) => ({ ...p, visible: false })),
      });
    } catch (err) {
      //console.error('Purchase error:', err);
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

  // Function to equip an item (icon or theme)
  const handleEquipItem = async (item: ShopItem) => {
    try {
      if (item.itemType === 'theme' && item.baseThemeType) {
        // Handle theme equipping
        await setBaseTheme(item.baseThemeType);
        setPopup({
          visible: true,
          title: 'Theme Applied',
          message: `Your new ${item.title} theme is now active!`,
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
          cancelText: '',
          onCancel: undefined,
        });
      } else if (item.itemType === 'icon' && item.tabType) {
        // Handle icon equipping
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
      }
    } catch (error) {
      //console.error('Failed to equip item:', error);
      setPopup({
        visible: true,
        title: 'Error',
        message: 'Something went wrong while equipping the item.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => setPopup((p) => ({ ...p, visible: false })),
        cancelText: '',
        onCancel: undefined,
      });
    }
  };

  // Check if a base theme is currently equipped
  const isThemeEquipped = (baseThemeType: BaseTheme): boolean => {
    return baseTheme === baseThemeType;
  };

  // Filtered shop items based on selected tab
  const getFilteredItems = () => {
    if (selectedTab === 'Themes') {
      return SHOP_ITEMS.filter((item) => item.itemType === 'theme');
    }
    return SHOP_ITEMS.filter((item) => item.itemType === 'icon' && item.tabType === selectedTab);
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
    theme,
    setTheme,

    // Popup state
    popup,
    setPopup,

    // Methods
    getFilteredItems,
    handlePurchase,
    handleEquipItem,
    isItemOwned,
    isThemeEquipped,
  };
};
