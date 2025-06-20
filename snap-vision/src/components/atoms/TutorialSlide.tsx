import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ImageSourcePropType } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface TutorialSlideProps {
  image: ImageSourcePropType;
  title: string;
  description: string;
}

const { width } = Dimensions.get('window');

const TutorialSlide = ({ image, title, description }: TutorialSlideProps) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.slide, { backgroundColor: colors.background, width }]}>
      <View style={styles.imageContainer}>
        <Image source={image} style={styles.image} resizeMode="contain" />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    width: width * 0.8,
    height: width * 1.2, // Adjust for aspect ratio of phone screenshots
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
});

export default TutorialSlide;