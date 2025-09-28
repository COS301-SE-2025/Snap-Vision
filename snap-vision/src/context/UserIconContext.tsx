import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { ShopItem } from '../hooks/useShopManager';

interface UserIconState {
  selectedIcons: Record<string, string>; // tabType -> iconName mapping
  equippedItems: string[]; // list of equipped shop item IDs
}

type UserIconContextType = {
  state: UserIconState;
  equipIcon: (tabType: string, iconName: string, itemId: string) => Promise<void>;
  getIconForTab: (tabType: string) => string | undefined;
  isItemEquipped: (itemId: string) => boolean;
};

const UserIconContext = createContext<UserIconContextType | undefined>(undefined);

// Default tab icons
const DEFAULT_ICONS: Record<string, string> = {
  Home: 'home-outline',
  Map: 'map-outline',
  Indoor: 'business-outline',
  Achievements: 'trophy-outline',
  Settings: 'settings-outline',
  Admin: 'shield-outline',
  Editor: 'pencil-outline',
};

// Default item IDs for each tab
const DEFAULT_EQUIPPED_ITEMS = [
  'home-icon-home',
  'map-icon-map',
  'achievements-icon-trophy',
  'settings-icon-settings',
];

export const UserIconProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UserIconState>({
    selectedIcons: { ...DEFAULT_ICONS },
    equippedItems: [...DEFAULT_EQUIPPED_ITEMS],
  });

  // Load saved icon preferences for current user
  const loadUserIconPreferences = async () => {
    try {
      const storageKeys = getStorageKeys();
      const savedIcons = await AsyncStorage.getItem(storageKeys.icons);
      const savedEquippedItems = await AsyncStorage.getItem(storageKeys.equipped);

      if (savedIcons) {
        setState((prev) => ({
          ...prev,
          selectedIcons: { ...prev.selectedIcons, ...JSON.parse(savedIcons) },
        }));
      }

        if (savedEquippedItems) {
          setState((prev) => ({
            ...prev,
            equippedItems: JSON.parse(savedEquippedItems),
          }));
        }
      } catch (error) {
        //console.error('Failed to load icon preferences:', error);
      }
    };

  // Load saved icon preferences on startup
  useEffect(() => {
    loadUserIconPreferences();
  }, []);

  // Clean up old storage format (migration helper)
  const cleanupOldStorage = async () => {
    try {
      await AsyncStorage.removeItem('@snap_vision_tab_icons');
      await AsyncStorage.removeItem('@snap_vision_equipped_items');
    } catch (error) {
      console.error('Failed to cleanup old storage:', error);
    }
  };

  // Listen to auth state changes to reset icons on logout and load on login
  useEffect(() => {
    // Clean up old storage format on first load
    cleanupOldStorage();

    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // User logged out - reset to defaults
        setState({
          selectedIcons: { ...DEFAULT_ICONS },
          equippedItems: [...DEFAULT_EQUIPPED_ITEMS],
        });
      } else {
        // User logged in - load their specific icon preferences
        await loadUserIconPreferences();
      }
    });

    return unsubscribe;
  }, []);

  // Helper to get user-specific storage keys
  const getStorageKeys = () => {
    const user = auth().currentUser;
    const userId = user?.uid || 'default';
    return {
      icons: `@snap_vision_tab_icons_${userId}`,
      equipped: `@snap_vision_equipped_items_${userId}`,
    };
  };

  // Update icon for a specific tab
  const equipIcon = async (tabType: string, iconName: string, itemId: string) => {
    try {
      // Update selected icons
      const updatedIcons = {
        ...state.selectedIcons,
        [tabType]: iconName,
      };

      // Update equipped items - first unequip any other item of same tab type
      const otherItemsOfSameTypeFiltered = state.equippedItems.filter(
        (id) => !id.startsWith(`${tabType.toLowerCase()}-icon-`),
      );
      const updatedEquippedItems = [...otherItemsOfSameTypeFiltered, itemId];

      // Save to user-specific storage
      const storageKeys = getStorageKeys();
      await AsyncStorage.setItem(storageKeys.icons, JSON.stringify(updatedIcons));
      await AsyncStorage.setItem(storageKeys.equipped, JSON.stringify(updatedEquippedItems));

      // Update state
      setState({
        selectedIcons: updatedIcons,
        equippedItems: updatedEquippedItems,
      });
    } catch (error) {
      //console.error('Failed to equip icon:', error);
    }
  };

  // Check if a specific item is currently equipped
  const isItemEquipped = (itemId: string): boolean => {
    return state.equippedItems.includes(itemId);
  };

  // Get icon name for a specific tab
  const getIconForTab = (tabType: string): string | undefined => {
    return state.selectedIcons[tabType] || DEFAULT_ICONS[tabType];
  };

  return (
    <UserIconContext.Provider
      value={{
        state,
        equipIcon,
        getIconForTab,
        isItemEquipped,
      }}
    >
      {children}
    </UserIconContext.Provider>
  );
};

export const useUserIcons = () => {
  const context = useContext(UserIconContext);
  if (!context) {
    throw new Error('useUserIcons must be used within a UserIconProvider');
  }
  return context;
};
