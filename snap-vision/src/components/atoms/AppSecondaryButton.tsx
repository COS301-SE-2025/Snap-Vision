import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';

interface Props extends TouchableOpacityProps {
  title: string;
}

export default function AppSecondaryButton({ title, testID, ...rest }: Props & { testID?: string }) {
  return (
    <TouchableOpacity style={styles.button} testID={testID} {...rest}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B78459',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'black',
    fontWeight: '600',
  },
});