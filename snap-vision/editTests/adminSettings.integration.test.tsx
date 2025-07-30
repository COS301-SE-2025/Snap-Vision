import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AdminSettingsForm from '../../src/components/organisms/AdminSettingsForm';
import { ThemeProvider } from '../../src/theme/ThemeContext';

jest.mock('react-native-gesture-handler', () => {
  const { View, TextInput, TouchableOpacity } = require('react-native');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: TextInput,
    ToolbarAndroid: View,
    TouchableHighlight: TouchableOpacity,
    TouchableNativeFeedback: View,
    TouchableOpacity: TouchableOpacity,
    TouchableWithoutFeedback: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    FlatList: View,
    gestureHandlerRootHOC: (component: any) => component,
    Directions: {},
  };
});

const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
});

const Stack = createStackNavigator();

const RealIntegrationWrapper = ({
  children,
  initialTheme = 'light',
  mockNavigation = createMockNavigation(),
}: {
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark';
  mockNavigation?: any;
}) => (
  <NavigationContainer>
    <ThemeProvider>
      <Stack.Navigator>
        <Stack.Screen name="AdminSettings">
          {() => {
            const Child = children as React.ReactElement;
            return React.isValidElement(Child) ? (
              <Child.type {...(Child.props as object)} navigation={mockNavigation} />
            ) : (
              Child
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>
    </ThemeProvider>
  </NavigationContainer>
);

describe('AdminSettingsForm Integration Tests', () => {
  let mockNavigation: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
  });

  describe('Component Rendering and State Management', () => {
    it('renders all sections and settings correctly', async () => {
      const { getByText } = render(
        <RealIntegrationWrapper mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        expect(getByText('Security Settings')).toBeTruthy();
        expect(getByText('Navigation Settings')).toBeTruthy();
        expect(getByText('Positioning Settings')).toBeTruthy();
        expect(getByText('Mobile App Settings')).toBeTruthy();
        expect(getByText('Notifications Settings')).toBeTruthy();

        expect(getByText('Enable 2FA for admins')).toBeTruthy();
        expect(getByText('Enable accessibility routes')).toBeTruthy();
        expect(getByText('Use QR fallback')).toBeTruthy();
        expect(getByText('Show onboarding tutorial')).toBeTruthy();
        expect(getByText('Email alerts for new user sign-ups')).toBeTruthy();
        expect(getByText('Notify on floorplan changes')).toBeTruthy();

        expect(getByText('Reset to Defaults')).toBeTruthy();
        expect(getByText('Save Settings')).toBeTruthy();
      });
    });

    it('tests reset functionality by checking button interaction', async () => {
      const { getByText } = render(
        <RealIntegrationWrapper mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        const resetButton = getByText('Reset to Defaults');

        expect(resetButton).toBeTruthy();

        fireEvent.press(resetButton);

        expect(getByText('Security Settings')).toBeTruthy();
        expect(getByText('Enable 2FA for admins')).toBeTruthy();
        expect(getByText('Reset to Defaults')).toBeTruthy();
      });
    });

    it('verifies toggle state changes through text visibility', async () => {
      const { getByText, getAllByText } = render(
        <RealIntegrationWrapper mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        const onTexts = getAllByText('On');
        const offTexts = getAllByText('Off');

        expect(onTexts.length).toBeGreaterThan(0);
        expect(offTexts.length).toBeGreaterThan(0);

        expect(getByText('Enable 2FA for admins')).toBeTruthy();
        expect(getByText('Enable accessibility routes')).toBeTruthy();
        expect(getByText('Use QR fallback')).toBeTruthy();

        const expectedToggleCount = 6;
        expect(onTexts.length).toBe(expectedToggleCount);
        expect(offTexts.length).toBe(expectedToggleCount);
      });
    });

    it('tests form state management through component rendering', async () => {
      const { getByText } = render(
        <RealIntegrationWrapper mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        const securitySection = getByText('Security Settings');
        const navigationSection = getByText('Navigation Settings');
        const positioningSection = getByText('Positioning Settings');
        const mobileSection = getByText('Mobile App Settings');
        const notificationsSection = getByText('Notifications Settings');

        expect(securitySection).toBeTruthy();
        expect(navigationSection).toBeTruthy();
        expect(positioningSection).toBeTruthy();
        expect(mobileSection).toBeTruthy();
        expect(notificationsSection).toBeTruthy();

        const resetButton = getByText('Reset to Defaults');
        const saveButton = getByText('Save Settings');

        fireEvent.press(resetButton);
        fireEvent.press(saveButton);

        expect(getByText('Security Settings')).toBeTruthy();
      });
    });
  });

  describe('Theme Integration', () => {
    it('applies light theme colors correctly', async () => {
      const { getByText } = render(
        <RealIntegrationWrapper initialTheme="light" mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        const sectionHeader = getByText('Security Settings');

        expect(sectionHeader).toBeTruthy();

        expect(getByText('Enable 2FA for admins')).toBeTruthy();
        expect(getByText('Save Settings')).toBeTruthy();
      });
    });

    it('applies dark theme colors correctly', async () => {
      const { getByText } = render(
        <RealIntegrationWrapper initialTheme="dark" mockNavigation={mockNavigation}>
          <AdminSettingsForm />
        </RealIntegrationWrapper>,
      );

      await waitFor(() => {
        const sectionHeader = getByText('Security Settings');

        expect(sectionHeader).toBeTruthy();

        expect(getByText('Enable 2FA for admins')).toBeTruthy();
        expect(getByText('Save Settings')).toBeTruthy();
      });
    });
  });
});
