// src/screens/IndoorNavigationInstructionsScreen.tsx
import React from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import IndoorNavigationInstructionsContent from '../components/organisms/IndoorNavigationInstructionsContent';

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
  Home: undefined;
};

type IndoorNavigationInstructionsScreenRouteProp = RouteProp<
  RootStackParamList,
  'IndoorNavigationInstructions'
>;

type IndoorNavigationInstructionsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'IndoorNavigationInstructions'
>;

export default function IndoorNavigationInstructionsScreen() {
  const navigation = useNavigation<IndoorNavigationInstructionsScreenNavigationProp>();
  const route = useRoute<IndoorNavigationInstructionsScreenRouteProp>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { buildingId, floorId, startRoomId, endRoomId } = route.params;

  const handleNavigationComplete = () => {
    // Navigate back to home or show completion screen
    navigation.navigate('Home');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <IndoorNavigationInstructionsContent
        buildingId={buildingId}
        floorId={floorId}
        startRoomId={startRoomId}
        endRoomId={endRoomId}
        onNavigationComplete={handleNavigationComplete}
        onBack={handleBack}
      />
    </SafeAreaView>
  );
}
