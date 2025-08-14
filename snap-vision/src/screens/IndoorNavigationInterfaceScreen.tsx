import React from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import IndoorNavigationInterfaceContent from '../components/organisms/IndoorNavigationInterfaceContent';

type RootStackParamList = {
  IndoorNavigationInterface: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
  IndoorNavigationInstructions: {
    buildingId: string;
    floorId: string;
    startRoomId: string;
    endRoomId: string;
    locationId: string;
  };
};

type RouteP = RouteProp<RootStackParamList, 'IndoorNavigationInterface'>;
type NavP = StackNavigationProp<RootStackParamList, 'IndoorNavigationInterface'>;

export default function IndoorNavigationInterfaceScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { buildingId, buildingName, locationId } = route.params;

  const handleNavigationStart = (startRoomId: string, endRoomId: string, floorId: string) => {
    navigation.navigate('IndoorNavigationInstructions', {
      buildingId,
      floorId,
      startRoomId,
      endRoomId,
      locationId,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <IndoorNavigationInterfaceContent
        buildingId={buildingId}
        buildingName={buildingName}
        locationId={locationId}
        onNavigationStart={handleNavigationStart}
      />
    </SafeAreaView>
  );
}
