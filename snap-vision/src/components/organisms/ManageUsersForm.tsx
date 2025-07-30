import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
  Button,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useUserManagement } from '../../hooks/useUserManagement';
import SearchInput from '../atoms/SearchInput';
import RoleFilter from '../molecules/RoleFilter';
import UserCard from '../molecules/UserCard';
import SettingsHeader from '../molecules/SettingsHeader';
import { User } from '../../types/User';

interface Props {
  navigation: any;
  currentUserId: string | undefined;
}

const ROLE_OPTIONS: Array<'Admin' | 'Editor' | 'Viewer'> = ['Admin', 'Editor', 'Viewer'];

export default function ManageUsersForm({ navigation, currentUserId }: Props) {
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
    allLocations,
  } = useUserManagement();

  // Modal states
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Editor' | 'Viewer' | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Step 1: Open role selection modal
  const onEditPress = (user: User) => {
    setEditingUser(user);
    setSelectedRole(null);
    setSelectedLocationId(null);
    setRoleModalVisible(true);
  };

  // Step 2: Confirm role selection
  const onConfirmRoleSelection = () => {
    if (!selectedRole || !editingUser) return;

    if (selectedRole === editingUser.role) {
      Alert.alert('Error', `User is already a ${selectedRole}`);
      return;
    }

    setRoleModalVisible(false);

    if (selectedRole === 'Editor') {
      // If Editor, open location modal next
      setLocationModalVisible(true);
    } else {
      // Admin or Viewer: confirm role change directly
      Alert.alert(
        'Confirm Role Change',
        `Are you sure you want to change ${editingUser.name}'s role to ${selectedRole}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => {
              editUser({ ...editingUser, role: selectedRole });
              resetEditingState();
            },
          },
        ],
      );
    }
  };

  // Step 3: Confirm location selection for Editor
  const confirmLocationSelection = () => {
    if (!selectedLocationId || !editingUser) {
      Alert.alert('Please select a location.');
      return;
    }
    editUser({ ...editingUser, role: 'Editor' }, selectedLocationId);
    resetEditingState();
  };

  // Reset all editing states
  const resetEditingState = () => {
    setEditingUser(null);
    setSelectedRole(null);
    setSelectedLocationId(null);
    setRoleModalVisible(false);
    setLocationModalVisible(false);
  };

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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
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
        <RoleFilter selectedRole={filters.role} onRoleChange={updateRoleFilter} />

        {/* User Accounts Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>User Accounts</Text>

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
                onEdit={() => onEditPress(user)}
                onDelete={(u) => {
                  if (u.id === currentUserId) {
                      Alert.alert('Action Not Allowed', 'You cannot delete yourself.');
                      return;
                    }
                  
                  Alert.alert('Confirm Deletion', `Are you sure you want to delete ${u.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteUser(u),
                    },
                  ]);
                }}
              />
            ))
          )}
        </View>

        {/* Role Selection Modal */}
        <Modal visible={roleModalVisible} transparent animationType="slide">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Role</Text>

              <View style={styles.roleButtonsContainer}>
                {ROLE_OPTIONS.map((roleOption) => {
                  const isSelected = selectedRole === roleOption;
                  return (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: isSelected ? colors.secondary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.text,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setSelectedRole(roleOption)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          color: isSelected ? 'white' : colors.text,
                          fontWeight: '600',
                          textAlign: 'center',
                        }}
                      >
                        {roleOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={resetEditingState} />
                <Button title="Confirm" onPress={onConfirmRoleSelection} disabled={!selectedRole} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Location Selection Modal */}
        <Modal visible={locationModalVisible} transparent animationType="slide">
          <View style={styles.modalBackground}>
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Location for Editor
              </Text>

              <FlatList
                data={allLocations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.locationItem,
                      {
                        backgroundColor:
                          selectedLocationId === item.id ? colors.background : colors.background,
                      },
                    ]}
                    onPress={() => setSelectedLocationId(item.id)}
                  >
                    <Text
                      style={{
                        color: selectedLocationId === item.id ? 'white' : colors.text,
                      }}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 250 }}
              />

              <View style={styles.modalButtons}>
                <Button title="Cancel" onPress={resetEditingState} />
                <Button
                  title="Confirm"
                  onPress={confirmLocationSelection}
                  disabled={!selectedLocationId}
                />
              </View>
            </View>
          </View>
        </Modal>
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
  modalBackground: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center', // <-- add this to center text horizontally
  },

  roleOption: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 6,
  },
  locationItem: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12, // space between buttons, works with React Native 0.71+
    marginVertical: 12,
  },
});
