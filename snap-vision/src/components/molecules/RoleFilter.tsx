// src/components/molecules/RoleFilter.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FilterButton from '../atoms/FilterButton';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  selectedRole: 'All' | 'Admin' | 'Viewer';
  onRoleChange: (role: 'All' | 'Admin' | 'Viewer') => void;
}

export default function RoleFilter({ selectedRole, onRoleChange }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Filter by Role</Text>
      <View style={styles.buttonsContainer}>
        <FilterButton
          title="Admin"
          iconName="shield-checkmark"
          isSelected={selectedRole === 'Admin'}
          onPress={() => onRoleChange('Admin')}
        />
        <FilterButton
          title="Viewer"
          iconName="eye"
          isSelected={selectedRole === 'Viewer'}
          onPress={() => onRoleChange('Viewer')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
});