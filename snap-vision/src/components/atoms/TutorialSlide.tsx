import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ImageSourcePropType,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface TutorialSlideProps {
  image: ImageSourcePropType;
  title: string;
  description: string;
}

const { width, height } = Dimensions.get('window');

const TutorialSlide = ({ image, title, description }: TutorialSlideProps) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={[styles.slideContent, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.imageContainer}>
        <Image
          source={image}
          style={styles.image}
          resizeMode="contain" 
        />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  slideContent: {
    alignItems: 'center',
    padding: 20,
    minHeight: height - 160,
  },
  imageContainer: {
    width: width * 0.9,
    height: height * 0.5, 
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center',
    alignItems: 'center', 
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
    marginBottom: 20,
  },
});

export default TutorialSlide;
