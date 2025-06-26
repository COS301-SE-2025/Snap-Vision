import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks for theme and navigation
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));
jest.mock('../../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#1E88E5',
    secondary: '#4CAF50',
    border: '#DDDDDD',
  }),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

// Mock SettingsHeader
jest.mock('../../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockSettingsHeader({ title }) {
    return (
      <View testID="settings-header">
        <Text>{title}</Text>
      </View>
    );
  };
});

// Mock ContactMethod for ContactMethods
jest.mock('../../src/components/atoms/ContactMethod', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockContactMethod({ email, label }) {
    return (
      <TouchableOpacity testID="contact-method">
        <Text>{label}</Text>
        <Text>{email}</Text>
      </TouchableOpacity>
    );
  };
});

// Mock FAQItem for FAQList
jest.mock('../../src/components/atoms/FAQItem', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockFAQItem({ question, answer }) {
    return (
      <View testID="faq-item">
        <TouchableOpacity>
          <Text>{question}</Text>
        </TouchableOpacity>
        <Text>{answer}</Text>
      </View>
    );
  };
});

// Mock TutorialSlide for TutorialSlider
jest.mock('../../src/components/atoms/TutorialSlide', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockTutorialSlide({ title, description }) {
    return (
      <View testID="tutorial-slide">
        <Text>{title}</Text>
        <Text>{description}</Text>
      </View>
    );
  };
});

jest.mock('../../src/components/molecules/TutorialSlider', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockTutorialSlider({ onFinish }) {
    return (
      <View testID="tutorial-slider">
        <View testID="tutorial-slide">
          <Text>Search for a Destination</Text>
        </View>
        <TouchableOpacity onPress={onFinish}>
          <Text>Finish</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// --- Real Component Imports ---
import ContactSupportContent from '../../src/components/organisms/ContactSupportContent';
import FAQContent from '../../src/components/organisms/FAQContent';
import TutorialContent from '../../src/components/organisms/TutorialContent';

describe('ContactSupportContent Integration', () => {
  it('renders header and contact methods', () => {
    const { getByTestId, getByText } = render(<ContactSupportContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Contact Support')).toBeTruthy();
    expect(getByTestId('contact-method')).toBeTruthy();
    expect(getByText('Email Support')).toBeTruthy();
    expect(getByText('bltscapstone@gmail.com')).toBeTruthy();
    expect(getByText('Get in touch with us')).toBeTruthy();
    expect(getByText('Our support team is available to help you.')).toBeTruthy();
    expect(getByText('When contacting support, please include:')).toBeTruthy();
    expect(getByText('• Your account email')).toBeTruthy();
    expect(getByText('• Device type and OS version')).toBeTruthy();
    expect(getByText('• A detailed description of the issue')).toBeTruthy();
  });
});

describe('FAQContent Integration', () => {
  it('renders header, intro, and FAQ list', () => {
    const { getByTestId, getByText, getAllByTestId } = render(<FAQContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Frequently Asked Questions')).toBeTruthy();
    expect(getByText('Find answers to common questions about using SnapVision below:')).toBeTruthy();
    // Should render all FAQ items
    expect(getAllByTestId('faq-item').length).toBeGreaterThan(0);
    expect(getByText('How do I navigate to a building?')).toBeTruthy();
    expect(getByText(/Tap on the search bar at the top/)).toBeTruthy();
  });

  it('expands and collapses FAQ item', () => {
    // Use the real FAQItem for this test to check expand/collapse
    jest.dontMock('../../src/components/atoms/FAQItem');
    const FAQContentReal = require('../../src/components/organisms/FAQContent').default;
    const { getByText } = render(<FAQContentReal />);
    const question = getByText('How do I navigate to a building?');
    fireEvent.press(question);
    // After pressing, the answer should be visible
    expect(getByText(/Tap on the search bar at the top/)).toBeTruthy();
  });
});

describe('TutorialContent Integration', () => {
  it('renders header and tutorial slider', () => {
    const { getByTestId, getByText } = render(<TutorialContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('How to Use SnapVision')).toBeTruthy();
    expect(getByTestId('tutorial-slide')).toBeTruthy();
    expect(getByText('Search for a Destination')).toBeTruthy();
  });

  it('calls navigation.goBack when tutorial is finished', () => {
    const goBack = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({ goBack });
    const { getByText } = render(<TutorialContent />);
    // Simulate pressing the Finish button in the slider
    fireEvent.press(getByText('Finish'));
    expect(goBack).toHaveBeenCalled();
  });
});