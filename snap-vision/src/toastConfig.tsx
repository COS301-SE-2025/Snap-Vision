import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DefaultToast = ({ text1, text2, props }: any) => {
  return (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor: props?.backgroundColor,
          borderColor: props?.borderColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: props?.textColor }]}>{text1}</Text>
      {text2 ? <Text style={[styles.message, { color: props?.textColor }]}>{text2}</Text> : null}
    </View>
  );
};

export const toastConfig = {
  default: (props: any) => <DefaultToast {...props} />,
};

const styles = StyleSheet.create({
  toastContainer: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 12,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  message: {
    fontSize: 14,
    marginTop: 4,
  },
});
