import React from 'react';
import { View, StyleSheet } from 'react-native';
import FAQItem from '../atoms/FAQItem';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const FAQList = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  const faqData = [
    {
      question: 'How do I navigate to a building?',
      answer:
        "Tap on the search bar at the top of the map screen, search for your destination building on campus, and select it from the results. Then tap 'Start' at the bottom of the screen to begin guided directions.",
    },
    {
      question: 'How do I choose a room in a building?',
      answer:
        "After selecting a building, you'll see a list of available rooms. Tap on the room you want to navigate to, and SnapVision will guide you there.",
    },
    {
      question: 'How do I earn badges?',
      answer:
        'You can earn badges by using different features of the app, visiting new locations, completing routes, and contributing to the community by reporting crowd levels.',
    },
    {
      question: 'What are the blue dots on the map?',
      answer:
        'Blue dots represent points of interest (POIs) such as buildings, landmarks, facilities, and amenities available on campus.',
    },
    {
      question: 'How can I view my account information?',
      answer:
        "Go to the Settings menu by tapping the gear icon, then select 'Account' to view and manage your account details.",
    },
    {
      question: 'What happens if I go off the route given to me?',
      answer:
        'SnapVision will automatically recalculate your route to get you back on track. Just continue following the new directions provided.',
    },
    {
      question: 'What do I do when SnapVision has my destination at the wrong location?',
      answer:
        'SnapVision relies on 3rd party content providers for POI locations. When you search for a building, SnapVision can only use the coordinates provided by these services. This can only be solved by updating the GPS coordinates with the 3rd party provider.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {faqData.map((faq, index) => (
        <FAQItem key={index} question={faq.question} answer={faq.answer} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
});

export default FAQList;
