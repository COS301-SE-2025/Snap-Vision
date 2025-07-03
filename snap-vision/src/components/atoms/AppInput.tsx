import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

type AppInputProps = TextInputProps & {
  style?: StyleProp<ViewStyle>;
  rightIcon?: string;
  onRightIconPress?: () => void;
};

export default function AppInput({ style, rightIcon, onRightIconPress, ...props }: AppInputProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { borderColor: colors.primary }, style]}>
      <TextInput
        {...props}
        style={[styles.input, { color: colors.text }]}
        placeholderTextColor={colors.secondary}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.icon}>
          <Icon name={rightIcon} size={20} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  icon: {
    marginLeft: 10,
  },
});
