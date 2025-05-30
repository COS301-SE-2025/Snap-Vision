import React from 'react';
import { View, StyleSheet } from 'react-native';
import AccountInfoField from '../atoms/AccountInfoField';

export default function AccountDetails() {
  return (
    <View style={styles.container}>
      <AccountInfoField label="Email Address" value="tonystark@gmail.com" />
      <AccountInfoField label="Phone Number" value="0720951970" />
      <AccountInfoField label="User Type" value="Student" />
      <AccountInfoField label="Password" value="***************" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
});