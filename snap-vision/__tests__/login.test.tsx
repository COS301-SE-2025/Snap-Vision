jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(null)),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginForm from '../src/components/organisms/LoginForm';
import { Alert } from 'react-native';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { DeepLinkProvider } from '../src/DeepLinkContext';
import { BadgeProvider } from '../src/context/BadgeContext';

const mockSignIn = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInWithEmailAndPassword: mockSignIn,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
  });
});

// Mock navigation with replace method
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: mockReplace,
  }),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'Icon');

jest.mock('expo-font', () => ({
  esModule: true,
  loadAsync: jest.fn().mockResolvedValue(true),
  isLoaded: jest.fn().mockReturnValue(true),
  Font: {
    loadAsync: jest.fn().mockResolvedValue(true),
    isLoaded: jest.fn().mockReturnValue(true),
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
  FontAwesome: 'MockedFontAwesome',
  FontAwesome5: 'MockedFontAwesome5',
  createIconSet: () => 'MockedIcon',
}));

// Mock DeepLinkContext
jest.mock('../src/DeepLinkContext', () => {
  const originalModule = jest.requireActual('../src/DeepLinkContext');
  return {
    ...originalModule,
    useDeepLink: () => ({
      coords: null,
      setCoords: jest.fn(),
    }),
  };
});

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('LoginForm', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    mockSignIn.mockClear();
    mockReplace.mockClear();
  });

  it('shows error when fields are empty', async () => {
    const { getByTestId } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <LoginForm />
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <LoginForm />
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123456');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('logs in and navigates on valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <DeepLinkProvider>
            <LoginForm />
          </DeepLinkProvider>
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    // Wait for the async actions to complete
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // Advance timers for the setTimeout in the component
    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(getByText('Login successful!')).toBeTruthy();
      expect(mockReplace).toHaveBeenCalledWith('Tabs');
    });
  });

  it('shows specific error message on login failure', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const { getByPlaceholderText, getByTestId } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <LoginForm />
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpass');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect password.');
    });
  });

  it('navigates to Register screen', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
      replace: jest.fn(),
    });

    const { getByText } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <LoginForm />
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  //We don't use Remember Me anymore
  // it('toggles Remember Me', () => {
  //   const { getByText } = render(
  //     <BadgeProvider>
  //     <ThemeProviderWrapper>
  //       <LoginForm />
  //     </ThemeProviderWrapper>
  //     </BadgeProvider>
  //   );
  //   const rememberMe = getByText(/Remember Me/);
  //   fireEvent.press(rememberMe);
  //   expect(rememberMe.props.children).toContain('◉');
  // });
});
