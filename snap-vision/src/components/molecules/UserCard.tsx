import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { User } from '../../types/User';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

export default function UserCard({ user, onEdit, onDelete, onToggleStatus }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const roleColor = user.role === 'Admin' ? colors.secondary : colors.roleSecondary;
  const statusColor = user.status === 'Active' ? colors.statusActive : colors.statusInactive;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.leftSection}>
        <Icon name="person-circle" size={40} color={colors.secondary} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.primary }]}>{user.name}</Text>
          <Text style={[styles.userEmail, { color: colors.secondary }]}>{user.email}</Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <View style={styles.roleStatusContainer}>
          <Text style={[styles.roleText, { color: roleColor }]}>{user.role}</Text>
          <Text style={[styles.statusText, { color: statusColor }]}>{user.status}</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(user)}>
            <Icon name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(user)}>
            <Icon name="close" size={20} color={colors.danger} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onToggleStatus(user)}>
            <Icon name="lock-closed" size={20} color={colors.warning} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  roleStatusContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
});
