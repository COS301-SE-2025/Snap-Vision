import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks for theme and navigation
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));
jest.mock('../src/theme', () => ({
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
  }),
}));

// Mock SettingsHeader
jest.mock('../src/components/molecules/SettingsHeader', () => {
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
jest.mock('../src/components/atoms/ContactMethod', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
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
jest.mock('../src/components/atoms/FAQItem', () => {
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

// Mock TutorialSlider for TutorialContent
jest.mock('../src/components/molecules/TutorialSlider', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockTutorialSlider({ onFinish }) {
    return (
      <View testID="tutorial-slider">
        <Text>Tutorial Slide</Text>
        <TouchableOpacity testID="finish-btn" onPress={onFinish}>
          <Text>Finish</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// --- Real Component Imports ---
import ContactSupportContent from '../src/components/organisms/ContactSupportContent';
import FAQContent from '../src/components/organisms/FAQContent';
import TutorialContent from '../src/components/organisms/TutorialContent';

describe('ContactSupportContent', () => {
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

describe('FAQContent', () => {
  it('renders header, intro, and FAQ list', () => {
    const { getByTestId, getByText, getAllByTestId } = render(<FAQContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Frequently Asked Questions')).toBeTruthy();
    expect(
      getByText('Find answers to common questions about using SnapVision below:'),
    ).toBeTruthy();
    // Should render all FAQ items
    expect(getAllByTestId('faq-item').length).toBeGreaterThan(0);
    expect(getByText('How do I navigate to a building?')).toBeTruthy();
    expect(getByText(/Tap on the search bar at the top/)).toBeTruthy();
  });
});

describe('TutorialContent', () => {
  it('renders header and tutorial slider', () => {
    const { getByTestId, getByText } = render(<TutorialContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('How to Use SnapVision')).toBeTruthy();
    expect(getByTestId('tutorial-slider')).toBeTruthy();
    expect(getByText('Tutorial Slide')).toBeTruthy();
  });

  it('calls navigation.goBack when tutorial is finished', () => {
    const goBack = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({ goBack });
    const { getByTestId } = render(<TutorialContent />);
    fireEvent.press(getByTestId('finish-btn'));
    expect(goBack).toHaveBeenCalled();
  });
});
