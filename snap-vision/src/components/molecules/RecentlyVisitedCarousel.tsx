import React from 'react';
import { FlatList, Image, TouchableOpacity, Text, View } from 'react-native';

const RecentlyVisitedCarousel = ({ pois }: { pois: any[] }) => {
  if (pois.length === 0) {
    return (
      <View style={{ padding: 10 }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>No recently visited locations.</Text>
      </View>
    );
  }
  return (
    <FlatList
      horizontal={true}
      data={pois}
      keyExtractor={(item: any) => item.poiId || item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{
            marginHorizontal: 10,
            padding: 10,
            backgroundColor: '#fff',
            borderRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            console.log('Selected POI:', item.name);
          }}
        >
          <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                 <Text style={{ color: '#666' }}>
          {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : 'No timestamp available'}
        </Text>
        </TouchableOpacity>
      )}
    />
  );
};

export default RecentlyVisitedCarousel;