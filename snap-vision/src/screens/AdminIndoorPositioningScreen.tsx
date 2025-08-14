import React from 'react';
import AdminIndoorPositioningContent from '../components/organisms/AdminIndoorPositioningContent';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminIndoorPositioning'>;

export default function AdminIndoorPositioningScreen({ navigation, route }: Props) {
  const { buildingId, floorId } = route.params;

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <AdminIndoorPositioningContent buildingId={buildingId} floorId={floorId} onBack={handleBack} />
  );
}
