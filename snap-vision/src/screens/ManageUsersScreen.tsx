import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import ManageUsersForm from '../components/organisms/ManageUsersForm';

interface Props {
  navigation: any;
}

export default function ManageUsersScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Content - TopBar is handled inside ManageUsersForm */}
      <ManageUsersForm navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});