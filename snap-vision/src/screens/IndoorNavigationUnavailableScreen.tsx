import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import SettingsHeader from '../components/molecules/SettingsHeader';

type RootStackParamList = {
  IndoorNavigationUnavailable: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};

type RouteP = RouteProp<RootStackParamList, 'IndoorNavigationUnavailable'>;
type NavP = StackNavigationProp<RootStackParamList, 'IndoorNavigationUnavailable'>;

export default function IndoorNavigationUnavailableScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  const { buildingName } = route.params;

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleReturnToMap = () => {
    // Navigate back to the main tabs (which should include the map)
    navigation.navigate('Tabs' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Navigation" />

      <View style={styles.content}>
        <View>
          <Image
            source={require('../assets/images/mascot_unavailable.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Indoor Navigation Unavailable</Text>

        <Text style={[styles.message, { color: colors.secondary }]}>
          Indoor navigation is not available for{' '}
          <Text style={[styles.buildingName, { color: colors.text }]}>{buildingName}</Text> at this
          time.
        </Text>

        <Text style={[styles.details, { color: colors.secondary }]}>
          This building may not have floor plans uploaded yet, or indoor navigation features may
          still be in development.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              {
                borderColor: colors.primary,
                backgroundColor: colors.background,
              },
            ]}
            onPress={handleGoBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.7,
  },
  mascotImage: {
    width: 170,
    height: 170,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  buildingName: {
    fontWeight: '600',
  },
  details: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
