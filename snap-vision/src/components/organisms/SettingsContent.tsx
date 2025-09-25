// SettingsContent.tsx
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import SearchInput from '../atoms/SettingsSearch';
import SettingItem from '../molecules/SettingsItem';
import { getThemeColors } from '../../theme';

interface Props {
  isDark: boolean;
  navigation: any;
}

export default function SettingsContent({ isDark, navigation }: Props) {
  const colors = getThemeColors(isDark);

  const items = [
    { icon: 'key', label: 'Account', screen: 'AccountSettings' },
    // { icon: 'star', label: 'Badges and Achievements', screen: 'Achievements' },
    { icon: 'human-wheelchair', label: 'Accessibility', screen: 'AccessibilitySettings' },
    //{ icon: 'lock', label: 'Privacy and Security', screen: 'PrivacySecurity' },
    { icon: 'bell', label: 'Notifications', screen: 'NotificationSettings' },
    { icon: 'cog', label: 'App Preferences', screen: 'AppPreferences' },
    { icon: 'information', label: 'Support', screen: 'Support' },
  ];

  return (
    <View style={[{ backgroundColor: colors.background }, styles.container]}>
      <View style={styles.listWrapper}>
        {items.map((item, index) => (
          <SettingItem
            key={index}
            icon={item.icon}
            label={item.label}
            color={colors.primary}
            onPress={() => navigation.navigate(item.screen)}
          />
        ))}
      </View>

      <Image
        source={require('../../../assets/mascot_settings.png')}
        style={styles.mascot}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  listWrapper: {
    marginTop: 24,
  },
  container: {
    position: 'relative',
    flex: 1,
  },
  mascot: {
    position: 'absolute',
    right: 12,
    bottom: -320,
    width: 180,
    height: 180,
    opacity: 0.9,
    pointerEvents: 'none',
  },
});
