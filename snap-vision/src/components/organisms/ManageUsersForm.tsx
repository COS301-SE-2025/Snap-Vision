import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useUserManagement } from '../../hooks/useUserManagement';
import SearchInput from '../atoms/SearchInput';
import RoleFilter from '../molecules/RoleFilter';
import UserCard from '../molecules/UserCard';
import ActionButton from '../atoms/ActionButton';
import SettingsHeader from '../molecules/SettingsHeader';

interface Props {
  navigation: any;
}

export default function ManageUsersForm({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const {
    users,
    loading,
    filters,
    updateSearchQuery,
    updateRoleFilter,
    editUser,
    deleteUser,
    toggleUserStatus,
    bulkDeactivate,
    addNewUser,
  } = useUserManagement();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Manage Users" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchInput
            placeholder="Search Users"
            value={filters.searchQuery}
            onChangeText={updateSearchQuery}
          />
          <Text style={[styles.searchSubtext, { color: colors.secondary }]}>
            Search by name or email
          </Text>
        </View>

        {/* Role Filter */}
        <RoleFilter
          selectedRole={filters.role}
          onRoleChange={updateRoleFilter}
        />

        {/* User Accounts Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            User Accounts
          </Text>

          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
                No users found
              </Text>
            </View>
          ) : (
            users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={editUser}
                onDelete={deleteUser}
                onToggleStatus={toggleUserStatus}
              />
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <ActionButton
            title="Bulk Deactivate"
            onPress={bulkDeactivate}
            variant="secondary"
            style={styles.actionButton}
          />
          <ActionButton
            title="Add New User"
            onPress={addNewUser}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchSubtext: {
    fontSize: 12,
    marginLeft: 20,
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
