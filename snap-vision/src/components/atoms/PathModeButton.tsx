import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PathModeButtonProps {
  isPathMode: boolean;
  onTogglePathMode: () => void;
  colors: {
    primary: string;
    card: string;
    border: string;
    text: string;
  };
}

const PathModeButton: React.FC<PathModeButtonProps> = ({
  isPathMode,
  onTogglePathMode,
  colors,
}) => {
  return (
    <TouchableOpacity
      onPress={onTogglePathMode}
      style={[
        styles.pathButton,
        {
          backgroundColor: isPathMode ? colors.primary : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={{ color: isPathMode ? '#FFFFFF' : colors.text }}>
        {isPathMode ? 'Exit Path Mode' : 'Create Path'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pathButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PathModeButton;
