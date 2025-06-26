// SettingItem.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import IconText from '../atoms/IconText';

interface Props {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

export default function SettingItem({ icon, label, color, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <IconText icon={icon} text={label} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
});
