import React from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Visit } from '../../services/firebase/recentlyVService';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
type Props = {
  visits: Visit[];
  testID?: string;
};
const RecentlyVisitedCarousel = ({ visits, testID }: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  if (visits.length === 0) {
    return (
      <View style={{ padding: 10 }}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>
          No recently visited locations.
        </Text>
      </View>
    );
  }

  return (
    <View testID={testID}>
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      data={visits}
      keyExtractor={(item, index) => item.id || item.poiId || index.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.primary,
              borderColor: colors.roleSecondary,
            },
          ]}
        >
          <Text style={[styles.name, { color: colors.background }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.timestamp && (
            <Text style={[styles.timestamp, { color: colors.background }]} numberOfLines={1}>
              {new Date(item.timestamp.toDate()).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      )}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 10,
  },
  card: {
    marginRight: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: 80,
  },
  name: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
  },
});

export default RecentlyVisitedCarousel;
