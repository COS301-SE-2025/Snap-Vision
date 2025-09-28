import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import ManageUsersForm from '../components/organisms/ManageUsersForm';
import auth from '@react-native-firebase/auth';

interface Props {
  navigation: any;
  currentUserId: string | undefined;
}

export default function ManageUsersScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const currentUserId = auth().currentUser?.uid;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Content - TopBar is handled inside ManageUsersForm */}
      <ManageUsersForm navigation={navigation} currentUserId={auth().currentUser?.uid} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
