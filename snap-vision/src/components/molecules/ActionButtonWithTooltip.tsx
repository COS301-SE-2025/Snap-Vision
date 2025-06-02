// src/components/molecules/ActionButtonWithTooltip.tsx
import React, { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Tooltip } from '../atoms/ToolTip';

interface Props {
  icon: ReactNode;
  onPress: () => void;
  showTooltip: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  backgroundColor: string;
  tooltipText: string;
}

const ActionButtonWithTooltip = ({
  icon,
  onPress,
  showTooltip,
  onPressIn,
  onPressOut,
  backgroundColor,
  tooltipText,
}: Props) => (
  <View style={styles.buttonWithTooltip}>
    {showTooltip && (
      <Tooltip text={tooltipText} />
    )}
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor }]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {icon}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonWithTooltip: {
    position: 'relative',
    alignItems: 'center',
  },
});

export default ActionButtonWithTooltip;