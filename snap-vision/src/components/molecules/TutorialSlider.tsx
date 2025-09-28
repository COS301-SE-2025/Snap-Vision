import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, Text } from 'react-native';
import TutorialSlide from '../atoms/TutorialSlide';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const { width } = Dimensions.get('window');

const TutorialSlider = ({ onFinish }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  const tutorialData = [
    {
      image: require('../../assets/images/search-destination.jpg'),
      title: 'Search for a Destination',
      description:
        'Enter your destination in the search bar at the top of the screen to find locations on campus.',
    },
    {
      image: require('../../assets/images/directions.jpg'),
      title: 'View Turn-by-Turn Directions',
      description: 'Get detailed step-by-step directions to help you navigate to your destination.',
    },
    {
      image: require('../../assets/images/route.jpg'),
      title: 'Follow Your Route',
      description:
        'Once you press Start, follow the highlighted route on the map to reach your destination.',
    },
  ];

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.floor(contentOffset.x / width + 0.5); // More accurate index calculation
    setActiveIndex(index);
  };

  const goToSlide = (index) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const handleNext = () => {
    if (activeIndex < tutorialData.length - 1) {
      goToSlide(activeIndex + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={tutorialData}
        renderItem={({ item }) => (
          <TutorialSlide image={item.image} title={item.title} description={item.description} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(_, index) => index.toString()}
        decelerationRate="fast" // Smoother paging
        snapToInterval={width} // Ensure proper page snapping
        snapToAlignment="center"
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {tutorialData.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                { backgroundColor: index === activeIndex ? colors.primary : colors.text + '40' },
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {activeIndex === tutorialData.length - 1 ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  footer: {
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TutorialSlider;
