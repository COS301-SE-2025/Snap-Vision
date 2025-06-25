import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  title: string;
  onBackPress?: () => void; // Optional custom back handler
}

export default function SettingsHeader({ title, onBackPress }: Props) {
  const navigation = useNavigation<NavigationProp<any>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
    // For debugging:
    console.log('Back button pressed');
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}> 
      <TouchableOpacity 
        onPress={handleBackPress}
        testID="back-button"
        style={styles.backButton} // Add hit area styling
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={[styles.title, { color: 'white' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  backButton: {
    padding: 8, // Increase touchable area
    marginLeft: -8, // Offset the padding to maintain visual alignment
  },
});