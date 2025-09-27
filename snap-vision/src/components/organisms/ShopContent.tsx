import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useShopManager, ShopItem } from '../../hooks/useShopManager';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';

const ShopContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const {
    badgeState,
    selectedTab,
    setSelectedTab,
    popup,
    setPopup,
    getFilteredItems,
    handlePurchase,
    handleEquipItem,
    isItemOwned,
    isItemEquipped,
    isThemeEquipped,
  } = useShopManager();

  // Render function for shop items
  const renderItem = ({ item }: { item: ShopItem }) => {
    // Check if user owns this item (either it's free or they've purchased it)
    const isOwned = isItemOwned(item);

    // Check if this item is currently equipped
    let isEquipped = false;
    if (item.itemType === 'theme' && item.themeType) {
      isEquipped = isThemeEquipped(item.themeType);
    } else if (item.itemType === 'icon') {
      isEquipped = isItemEquipped(item.id);
    }

    // Use a safe default icon if needed
    const iconName = item.icon || 'help-circle';

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isEquipped ? colors.primary : colors.border,
            borderWidth: isEquipped ? 2 : 1,
          },
        ]}
      >
        <Icon name={iconName} size={32} color={colors.primary} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.subtleText }]}>{item.description}</Text>

        {isOwned ? (
          <TouchableOpacity
            style={[
              styles.buyButton,
              {
                backgroundColor: isEquipped ? colors.secondary : colors.primary,
              },
            ]}
            onPress={() => handleEquipItem(item)}
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
          },
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
    <View style={styles.container}>
      <SettingsHeader title="Shop" />
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Customize your app with different themes and navigation icons!
      </Text>

      {/* Tab selector */}
      <View style={styles.tabSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabSelectorContent}
        >
          {['Themes', 'Home', 'Map', 'Achievements', 'Settings'].map(renderTabButton)}
        </ScrollView>
      </View>

      {/* Available points display */}
      <View style={[styles.pointsContainer, { backgroundColor: colors.card }]}>
        <Icon name="wallet-outline" size={16} color={colors.primary} style={styles.pointsIcon} />
        <Text style={[styles.pointsText, { color: colors.text }]}>
          {badgeState.points} points available
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

      {/* StandardPopup for all shop actions */}
      <StandardPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        confirmText={popup.confirmText}
        cancelText={popup.cancelText}
        showCancel={popup.showCancel}
        onConfirm={popup.onConfirm}
        onCancel={popup.onCancel}
      />
    </View>
  );
};

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

export default ShopContent;
