import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  color: string;
  textColor: string;
  descriptionColor: string;
}

export default function SettingsToggleItem({
  icon,
  label,
  description,
  value,
  onToggle,
  color,
  textColor,
  descriptionColor,
}: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onToggle(!value)} activeOpacity={0.7}>
      <View style={styles.leftContent}>
        <Icon
          name={icon}
          size={24}
          color={color}
          style={styles.icon}
          testID="settings-toggle-icon"
        />
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          {description && (
            <Text style={[styles.description, { color: descriptionColor }]}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#767577', true: color }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
    width: 24,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
});
