import React from 'react';
import { View, StyleSheet } from 'react-native';
import SectionTitle from '../atoms/SectionTitle';
import SearchInput from '../atoms/SearchInput';
import SettingItem from '../molecules/SettingsItem';

interface Props {
  isDark: boolean;
}

export default function SettingsContent({ isDark }: Props) {
  const colors = {
    background: isDark ? '#000' : '#fff',
    textPrimary: isDark ? '#f5f5f5' : '#222',
    border: isDark ? '#444' : '#ccc',
    card: isDark ? '#1e1e1e' : '#f0f0f0',
    textBoxBackground: isDark ? '#824713' : '#B78459',
    textBoxText: '#000',
  };

  const items = [
    { icon: 'key', label: 'Account' },
    { icon: 'star', label: 'Badges and Achievements' },
    { icon: 'lock', label: 'Privacy and Security' },
    { icon: 'bell', label: 'Notifications' },
    { icon: 'cog', label: 'App Preferences' },
    { icon: 'information', label: 'Support' },
  ];

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View style={styles.searchWrapper}>
        <SearchInput
          placeholder="Search Settings"
          onSearch={() => {}}
          textColor={colors.textBoxText}
          backgroundColor={colors.textBoxBackground}
          borderColor={colors.textBoxBackground}
        />
      </View>

      <View style={styles.listWrapper}>
        {items.map((item, index) => (
          <SettingItem
            key={index}
            icon={item.icon}
            label={item.label}
            color={colors.textPrimary}
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
