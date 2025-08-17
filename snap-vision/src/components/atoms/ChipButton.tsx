import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface ChipButtonProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: object;
  textStyle?: object;
}

const ChipButton: React.FC<ChipButtonProps> = ({
  label,
  selected = false,
  onPress,
  style,
  textStyle,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.card },
        style,
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          { color: selected ? '#FFF' : colors.text },
          textStyle
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
});

export default ChipButton;
