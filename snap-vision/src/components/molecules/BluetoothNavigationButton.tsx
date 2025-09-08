import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface BluetoothNavigationButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

/**
 * BluetoothNavigationButton - A standalone button for Bluetooth navigation
 */
const BluetoothNavigationButton: React.FC<BluetoothNavigationButtonProps> = ({ 
  onPress, 
  disabled = false 
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button, 
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1 
          }
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel="Bluetooth navigation"
        accessibilityHint="Navigate to buildings with Bluetooth beacons"
      >
        <View style={styles.buttonContent}>
          <MaterialIcons 
            name="bluetooth" 
            size={20} 
            color={colors.primary} 
          />
          <Text style={[styles.buttonText, { color: colors.text }]}>
            Bluetooth Navigation
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 999,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default BluetoothNavigationButton;
