// src/components/molecules/HeaderWithIcons.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from '../atoms/IconButton';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function HeaderWithIcons() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

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
      />

      <FAIcon
        name="user-circle"
        size={28}
        color={colors.secondary}
        style={styles.profile}
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
    fontSize: 54,
    textAlign: 'center',
  },
  notification: {
    position: 'absolute',
    top: -10,   
    right: 50,
  },
  profile: {
    position: 'absolute',
    top: -10,   
    right: 10,
  },
});
