// SettingsContent.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionTitle from '../atoms/SectionTitle';
import SearchInput from '../atoms/SettingsSearch';
import SettingItem from '../molecules/SettingsItem';
import { useTheme } from '../../theme/ThemeContext';
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
    { icon: 'lock', label: 'Privacy and Security', screen: 'PrivacySecurity' },
    { icon: 'bell', label: 'Notifications', screen: 'NotificationSettings' },
    { icon: 'cog', label: 'App Preferences', screen: 'AppPreferences' },
    { icon: 'information', label: 'Support', screen: 'Support' },
  ];

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={styles.searchWrapper}>
        <SearchInput
          placeholder="Search Settings"
          onSearch={() => {}}
          textColor={colors.secondary}
          backgroundColor={colors.background}
          borderColor={colors.primary}
        />
      </View>

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
});
