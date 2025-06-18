// src/components/molecules/HeaderWithIcons.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from '../atoms/IconButton';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation } from '@react-navigation/native';

  type RootStackParamList = {
    NotificationSettingsScreen: undefined;
    AccountSettings: undefined;
  };

export default function HeaderWithIcons() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <Text style={[styles.title, {
        fontFamily: 'PermanentMarkerRegular',
        color: colors.primary,
        transform: [{ rotate: '-3deg' }],
      }]}>
        GOING SOMEWHERE?
      </Text>

      <IconButton
        name="notifications-outline"
        color={colors.secondary}
        style={styles.notification}
        onPress={() =>
          navigation.navigate('Settings', {
            screen: 'NotificationSettings',
          })
        }
      />

      <FAIcon
        name="user-circle"
        size={28}
        color={colors.secondary}
        style={styles.profile}
        onPress={() =>
          navigation.navigate('Settings', {
            screen: 'AccountSettings',
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 32,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 20,
  },
  title: {
    fontSize: 42,
    textAlign: 'center',
    maxWidth: '90%',
  },
  notification: {
    position: 'absolute',
    top: -50,   
    right: 55,
  },
  profile: {
    position: 'absolute',
    top: -50,   
    right: 15,
  },
});
