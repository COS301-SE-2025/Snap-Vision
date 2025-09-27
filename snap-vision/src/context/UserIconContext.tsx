import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShopItem } from '../screens/ShopScreen';

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

  // Load saved icon preferences on startup
  useEffect(() => {
    const loadIconPreferences = async () => {
      try {
        const savedIcons = await AsyncStorage.getItem('@snap_vision_tab_icons');
        const savedEquippedItems = await AsyncStorage.getItem('@snap_vision_equipped_items');

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

    loadIconPreferences();
  }, []);

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

      // Save to storage
      await AsyncStorage.setItem('@snap_vision_tab_icons', JSON.stringify(updatedIcons));
      await AsyncStorage.setItem(
        '@snap_vision_equipped_items',
        JSON.stringify(updatedEquippedItems),
      );

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
