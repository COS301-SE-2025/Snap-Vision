import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminSettingsForm from './AdminSettingsForm';
import { ThemeProvider } from '../src/theme/ThemeContext';

//mock all dependencies
jest.mock('../src/components/atoms/Toggle', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockToggle({ value, onValueChange, testID }: any) {
    return (
      <TouchableOpacity testID={testID || 'toggle'} onPress={() => onValueChange(!value)}>
        <Text testID={`${testID}-text`}>{value ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../src/components/molecules/SettingItem', () => {
  const { View, Text } = require('react-native');
  const React = require('react');

  return function MockSettingItem({
    title,
    description,
    rightComponent,
    titleStyle,
    descriptionStyle,
    testID,
  }: any) {
    let clonedRightComponent = rightComponent;
    if (rightComponent && React.isValidElement(rightComponent)) {
      const toggleTestID = `toggle-${title?.toLowerCase().replace(/\s+/g, '-')}`;
      clonedRightComponent = React.cloneElement(rightComponent, {
        ...(rightComponent.props as any),
        testID: toggleTestID,
      } as any);
    }

    return (
      <View testID={testID || `setting-item-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text testID="setting-title" style={titleStyle}>
          {title}
        </Text>
        {description && (
          <Text testID="setting-description" style={descriptionStyle}>
            {description}
          </Text>
        )}
        {clonedRightComponent && (
          <View testID="setting-right-component">{clonedRightComponent}</View>
        )}
      </View>
    );
  };
});

jest.mock('../src/components/atoms/ThemedText', () => {
  const { Text } = require('react-native');
  return function MockThemedText({ children, style, size, weight, ...props }: any) {
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  };
});

jest.mock('../src/components/molecules/SettingsHeader', () => {
  const { View, Text } = require('react-native');
  return function MockSettingsHeader({ title }: any) {
    return (
      <View testID="settings-header">
        <Text testID="settings-header-title">{title}</Text>
      </View>
    );
  };
});

jest.mock('../src/components/atoms/AppSecondaryButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockAppSecondaryButton({ title, onPress, testID }: any) {
    return (
      <TouchableOpacity testID={testID || 'app-secondary-button'} onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../src/components/atoms/AppButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockAppButton({ title, onPress, testID }: any) {
    return (
      <TouchableOpacity testID={testID || 'app-button'} onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../src/theme/ThemeContext', () => {
  const React = require('react');

  let currentTheme = 'light';

  const ThemeContext = React.createContext(null);

  return {
    ThemeProvider: ({ children, initialTheme }: any) => {
      if (initialTheme) {
        currentTheme = initialTheme;
      }

      const contextValue = {
        isDark: currentTheme === 'dark',
        theme: currentTheme,
        toggleTheme: jest.fn(),
      };

      return React.createElement(ThemeContext.Provider, { value: contextValue }, children);
    },
    useTheme: () => ({
      isDark: currentTheme === 'dark',
      theme: currentTheme,
      toggleTheme: jest.fn(),
    }),
  };
});

jest.mock('../src/theme', () => ({
  getThemeColors: (isDark: boolean) => ({
    background: isDark ? '#000000' : '#FFFFFF',
    primary: isDark ? '#FFFFFF' : '#000000',
    secondary: isDark ? '#CCCCCC' : '#666666',
    accent: isDark ? '#FF6B6B' : '#4ECDC4',
  }),
}));

const TestWrapper = ({
  children,
  theme = 'light',
}: {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}) => <ThemeProvider>{children}</ThemeProvider>;

describe('AdminSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders correctly with all sections', () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      expect(getByTestId('settings-header')).toBeTruthy();
      expect(getByText('App Settings')).toBeTruthy();

      expect(getByText('Security Settings')).toBeTruthy();
      expect(getByText('Navigation Settings')).toBeTruthy();
      expect(getByText('Positioning Settings')).toBeTruthy();
      expect(getByText('Mobile App Settings')).toBeTruthy();
      expect(getByText('Notifications Settings')).toBeTruthy();
    });

    it('renders all setting items correctly', () => {
      const { getByText } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      expect(getByText('Enable 2FA for admins')).toBeTruthy();
      expect(getByText('Session timeout duration')).toBeTruthy();

      expect(getByText('Default view mode')).toBeTruthy();
      expect(getByText('Enable accessibility routes')).toBeTruthy();

      expect(getByText('Use QR fallback')).toBeTruthy();
      expect(getByText('Beacon sync interval')).toBeTruthy();

      expect(getByText('Show onboarding tutorial')).toBeTruthy();
      expect(getByText('Default map zoom level')).toBeTruthy();

      expect(getByText('Email alerts for new user sign-ups')).toBeTruthy();
      expect(getByText('Notify on floorplan changes')).toBeTruthy();
    });

    it('renders action buttons', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      expect(getByTestId('app-secondary-button')).toBeTruthy();
      expect(getByTestId('app-button')).toBeTruthy();
    });
  });

  describe('Toggle Functionality', () => {
    it('toggles 2FA setting correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const twoFAToggle = getByTestId('toggle-enable-2fa-for-admins');
      const toggleText = getByTestId('toggle-enable-2fa-for-admins-text');

      expect(toggleText).toHaveTextContent('OFF');

      fireEvent.press(twoFAToggle);

      await waitFor(() => {
        expect(toggleText).toHaveTextContent('ON');
      });
    });

    it('toggles accessibility routes correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const accessibilityToggle = getByTestId('toggle-enable-accessibility-routes');
      const toggleText = getByTestId('toggle-enable-accessibility-routes-text');

      expect(toggleText).toHaveTextContent('ON');

      fireEvent.press(accessibilityToggle);

      await waitFor(() => {
        expect(toggleText).toHaveTextContent('OFF');
      });
    });

    it('toggles QR fallback correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const qrToggle = getByTestId('toggle-use-qr-fallback');
      const toggleText = getByTestId('toggle-use-qr-fallback-text');

      const initialText = toggleText.props.children;
      fireEvent.press(qrToggle);

      await waitFor(() => {
        const newText = toggleText.props.children;
        expect(newText).not.toBe(initialText);
      });
    });

    it('toggles onboarding tutorial correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const onboardingToggle = getByTestId('toggle-show-onboarding-tutorial');
      const toggleText = getByTestId('toggle-show-onboarding-tutorial-text');

      const initialText = toggleText.props.children;
      fireEvent.press(onboardingToggle);

      await waitFor(() => {
        const newText = toggleText.props.children;
        expect(newText).not.toBe(initialText);
      });
    });

    it('toggles email alerts correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const emailToggle = getByTestId('toggle-email-alerts-for-new-user-sign-ups');
      const toggleText = getByTestId('toggle-email-alerts-for-new-user-sign-ups-text');

      const initialText = toggleText.props.children;
      fireEvent.press(emailToggle);

      await waitFor(() => {
        const newText = toggleText.props.children;
        expect(newText).not.toBe(initialText);
      });
    });

    it('toggles floorplan notifications correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const floorplanToggle = getByTestId('toggle-notify-on-floorplan-changes');
      const toggleText = getByTestId('toggle-notify-on-floorplan-changes-text');

      const initialText = toggleText.props.children;
      fireEvent.press(floorplanToggle);

      await waitFor(() => {
        const newText = toggleText.props.children;
        expect(newText).not.toBe(initialText);
      });
    });
  });

  describe('Reset to Defaults Functionality', () => {
    it('resets all settings to default values when reset button is pressed', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const twoFAToggle = getByTestId('toggle-enable-2fa-for-admins');
      const twoFAText = getByTestId('toggle-enable-2fa-for-admins-text');
      const accessibilityToggle = getByTestId('toggle-enable-accessibility-routes');
      const accessibilityText = getByTestId('toggle-enable-accessibility-routes-text');

      const initialTwoFA = twoFAText.props.children;
      const initialAccessibility = accessibilityText.props.children;

      fireEvent.press(twoFAToggle);
      fireEvent.press(accessibilityToggle);

      await waitFor(() => {
        expect(twoFAText.props.children).not.toBe(initialTwoFA);
        expect(accessibilityText.props.children).not.toBe(initialAccessibility);
      });

      const resetButton = getByTestId('app-secondary-button');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(twoFAText.props.children).toBe(initialTwoFA);
        expect(accessibilityText.props.children).toBe(initialAccessibility);
      });
    });
  });

  describe('Save Settings Functionality', () => {
    it('logs message when save button is pressed', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const saveButton = getByTestId('app-button');
      fireEvent.press(saveButton);

      expect(consoleSpy).toHaveBeenCalledWith('Settings saved');

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Integration', () => {
    it('applies light theme colors correctly', () => {
      const { getByText } = render(
        <TestWrapper theme="light">
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const sectionHeader = getByText('Security Settings');
      expect(sectionHeader.props.style).toMatchObject({
        color: '#000000',
      });
    });
  });

  describe('Static Display Values', () => {
    it('displays correct static values for non-toggleable settings', () => {
      const { getByText } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      expect(getByText('15 minutes')).toBeTruthy();
      expect(getByText('AR')).toBeTruthy();
      expect(getByText('30 sec')).toBeTruthy();
      expect(getByText('Auto')).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('has proper scroll view structure', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      expect(getByTestId('settings-header')).toBeTruthy();
    });
  });
  describe('Edge Cases', () => {
    it('handles rapid toggle interactions', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const toggle = getByTestId('toggle-enable-2fa-for-admins');
      const toggleText = getByTestId('toggle-enable-2fa-for-admins-text');

      const initialState = toggleText.props.children;

      fireEvent.press(toggle);
      fireEvent.press(toggle);
      fireEvent.press(toggle);

      await waitFor(() => {
        expect(toggleText.props.children).not.toBe(initialState);
      });
    });

    it('maintains state consistency after multiple operations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminSettingsForm />
        </TestWrapper>,
      );

      const twoFAToggle = getByTestId('toggle-enable-2fa-for-admins');
      const twoFAText = getByTestId('toggle-enable-2fa-for-admins-text');
      const resetButton = getByTestId('app-secondary-button');

      const initialState = twoFAText.props.children;

      fireEvent.press(twoFAToggle);
      fireEvent.press(resetButton);
      fireEvent.press(twoFAToggle);

      await waitFor(() => {
        expect(twoFAText.props.children).not.toBe(initialState);
      });
    });
  });
});
