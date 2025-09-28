import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import { BuildingListItem } from '../components/molecules/BuildingListItem';
import { LoadingState } from '../components/molecules/LoadingState';
import { EmptyState } from '../components/molecules/EmptyState';
import { useBuildings } from '../hooks/useBuildings';

type RootStackParamList = {
  BuildingSelection: undefined;
  IndoorNavigationInterface: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};

type BuildingSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BuildingSelection'
>;

export default function BuildingSelectionScreen() {
  const navigation = useNavigation<BuildingSelectionScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const { buildings, isLoading } = useBuildings();

  const handleBuildingSelect = (building: any) => {
    navigation.navigate('IndoorNavigationInterface', {
      buildingId: building.id,
      buildingName: building.name,
      locationId: building.location,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Indoor Navigation" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (buildings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Indoor Navigation" />
        <EmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Navigation" />
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Select a building to start indoor navigation
        </Text>
      </View>
      <FlatList
        data={buildings}
        renderItem={({ item }) => (
          <BuildingListItem building={item} onPress={handleBuildingSelect} />
        )}
        keyExtractor={(item) => item.id}
        style={styles.buildingsList}
        contentContainerStyle={styles.buildingsListContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  buildingsList: { flex: 1 },
  buildingsListContent: { padding: 16 },
});
