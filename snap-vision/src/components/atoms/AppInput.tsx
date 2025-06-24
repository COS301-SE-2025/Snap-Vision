import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

type AppInputProps = TextInputProps & {
  style?: any;
  rightIcon?: string; 
  onRightIconPress?: () => void;
};

export default function AppInput({
  style,
  rightIcon,
  onRightIconPress,
  ...props
}: AppInputProps) {
  const { isDark } = useTheme();
  const borderColor = isDark ? '#824713' : '#B78459';
  const textColor = isDark ? '#ffffff' : '#000000';
  const placeholderColor = isDark ? '#90AFA8' : '#3E5650';

  return (
    <View style={[styles.container, { borderColor }, style]}>
      <TextInput
        {...props}
        style={[styles.input, { color: textColor }]}
        placeholderTextColor={placeholderColor}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.icon}>
          <Icon name={rightIcon} size={20} color={placeholderColor} />
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
