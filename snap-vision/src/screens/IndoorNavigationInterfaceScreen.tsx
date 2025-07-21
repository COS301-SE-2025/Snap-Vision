// src/screens/IndoorNavigationInterfaceScreen.tsx
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
  };
  IndoorNavigationInstructions: {
    buildingId: string;
    floorId: string;
    startRoomId: string;
    endRoomId: string;
  };
};

type IndoorNavigationInterfaceScreenRouteProp = RouteProp<
  RootStackParamList,
  'IndoorNavigationInterface'
>;

type IndoorNavigationInterfaceScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'IndoorNavigationInterface'
>;

export default function IndoorNavigationInterfaceScreen() {
  const navigation = useNavigation<IndoorNavigationInterfaceScreenNavigationProp>();
  const route = useRoute<IndoorNavigationInterfaceScreenRouteProp>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { buildingId, buildingName } = route.params;

  const handleNavigationStart = (startRoomId: string, endRoomId: string, floorId: string) => {
    navigation.navigate('IndoorNavigationInstructions', {
      buildingId,
      floorId,
      startRoomId,
      endRoomId,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <IndoorNavigationInterfaceContent
        buildingId={buildingId}
        buildingName={buildingName}
        onNavigationStart={handleNavigationStart}
      />
    </SafeAreaView>
  );
}
