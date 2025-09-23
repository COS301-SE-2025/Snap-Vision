import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export const EmptyState: React.FC = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.emptyContainer}>
      <Icon name="domain-off" size={64} color={colors.secondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Buildings Available</Text>
      <Text style={[styles.emptyText, { color: colors.secondary }]}>
        No buildings with indoor navigation are currently available. Buildings need room POIs to
        enable navigation.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
