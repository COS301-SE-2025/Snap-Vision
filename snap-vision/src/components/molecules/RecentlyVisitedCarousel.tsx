import React from 'react';
import { FlatList, Image, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Visit } from '../../services/firebase/recentlyVService';

const RecentlyVisitedCarousel = ({ visits }: { visits: Visit[] }) => {
  if (visits.length === 0) {
    return (
      <View style={{ padding: 10 }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>No recently visited locations.</Text>
      </View>
    );
  }
  return (
    <FlatList
      horizontal={true}
      data={visits}
      keyExtractor={(item, index) => item.id || item.poiId || index.toString()} // Ensure a unique key for each item
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => console.log('Selected:', item.name)}>
          <Text style={styles.name}>{item.name}</Text>
          {item.timestamp && (
            <Text style={styles.timestamp}>
              {new Date(item.timestamp.toDate()).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
};
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    minWidth: 180,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
});

export default RecentlyVisitedCarousel;
