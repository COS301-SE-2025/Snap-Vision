import React from 'react';
import { View, StyleSheet } from 'react-native';
import ThemedText from '../components/atoms/ThemedText';
import AppButton from '../components/atoms/AppButton';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

type AdminStackParamList = {
  AdminLoadFloorplans: undefined;
};

type AdminNavigationProp = NavigationProp<AdminStackParamList>;

const AdminScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<AdminNavigationProp>();

  const handleLoadFloorplans = () => {
    navigation.navigate('AdminLoadFloorplans');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText size="xl" weight="bold" style={[styles.title, { color: colors.text }]}>
        Admin Dashboard
      </ThemedText>
      
      <View style={styles.buttonContainer}>
        <AppButton 
          title="Load Floorplans" 
          onPress={handleLoadFloorplans}
          style={styles.adminButton}
        />
      </View>
    </View>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  adminButton: {
    marginBottom: 16,
  },
});