import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface IndoorNavigationButtonProps {
  visible: boolean;
  colors: any;
  onPress: () => void;
}

const IndoorNavigationButton: React.FC<IndoorNavigationButtonProps> = ({
  visible,
  colors,
  onPress,
}) => {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        elevation: 4,
      }}
      onPress={onPress}
    >
      <Text style={{ color: colors.text, fontWeight: 'bold' }}>Navigate Indoors</Text>
    </TouchableOpacity>
  );
};

export default IndoorNavigationButton;
