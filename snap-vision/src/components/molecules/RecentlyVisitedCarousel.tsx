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
 
};

export default RecentlyVisitedCarousel;