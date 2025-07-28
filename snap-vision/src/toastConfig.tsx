import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const StyledToast = ({ text1, text2, props }: any) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.toastBox,
          {
            backgroundColor: props?.backgroundColor || '#F2F7FF',
            borderColor: props?.borderColor || '#007AFF',
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Icon name="information-circle-outline" size={24} color={props?.iconColor || '#007AFF'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: props?.textColor || '#007AFF' }]}>{text1}</Text>
          {text2 ? (
            <Text style={[styles.subtitle, { color: props?.textColor || '#007AFF' }]}>{text2}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export const toastConfig = {
  default: (props: any) => <StyledToast {...props} />,
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    backgroundColor: '#F2F7FF',
    borderColor: '#007AFF',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
});
