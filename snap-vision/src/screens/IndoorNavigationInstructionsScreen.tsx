import React from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import IndoorNavigationInstructionsContent from '../../editTests/IndoorNavigationInstructionsContent';

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
  Home: undefined;
};

type RouteP = RouteProp<RootStackParamList, 'IndoorNavigationInstructions'>;
type NavP = StackNavigationProp<RootStackParamList, 'IndoorNavigationInstructions'>;

export default function IndoorNavigationInstructionsScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { buildingId, floorId, startRoomId, endRoomId, locationId } = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <IndoorNavigationInstructionsContent
        buildingId={buildingId}
        floorId={floorId}
        startRoomId={startRoomId}
        endRoomId={endRoomId}
        locationId={locationId} // new
        onNavigationComplete={() => navigation.navigate('Home')}
        onBack={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}
