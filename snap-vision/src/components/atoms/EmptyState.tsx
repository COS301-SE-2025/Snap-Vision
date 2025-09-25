import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface EmptyStateProps {
  colors: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({ colors }) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="bluetooth-disabled" size={48} color={colors.secondary} />
    <Text style={[styles.emptyText, { color: colors.secondary }]}>
      No buildings with Bluetooth beacons found
    </Text>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default EmptyState;
