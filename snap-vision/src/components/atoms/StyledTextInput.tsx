import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface StyledTextInputProps extends TextInputProps {
  label?: string;
  containerStyle?: object;
  inputStyle?: object;
  labelStyle?: object;
}

const StyledTextInput: React.FC<StyledTextInputProps> = ({
  label,
  containerStyle,
  inputStyle,
  labelStyle,
  ...props
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }, labelStyle]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: colors.card, 
            color: colors.text,
            borderColor: colors.border
          },
          inputStyle,
        ]}
        placeholderTextColor={colors.secondary}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
});

export default StyledTextInput;
