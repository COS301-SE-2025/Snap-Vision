// SettingItem.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import IconText from '../atoms/IconText';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function SettingItem({ icon, label, onPress }: Props) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]} onPress={onPress}>
      <IconText icon={icon} text={label} color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
