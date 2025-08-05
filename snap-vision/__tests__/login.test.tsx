jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(null)),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginForm from '../src/components/organisms/LoginForm';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { DeepLinkProvider } from '../src/DeepLinkContext';
import { BadgeProvider } from '../src/context/BadgeContext';
import Toast from 'react-native-toast-message';

const mockSignIn = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInWithEmailAndPassword: mockSignIn,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
  });
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
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

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
  FontAwesome: 'MockedFontAwesome',
  FontAwesome5: 'MockedFontAwesome5',
  createIconSet: () => 'MockedIcon',
}));

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

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('LoginForm', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error when fields are empty', async () => {
    const { getByTestId, getByText } = render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <LoginForm />
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Email is required.')).toBeTruthy();
      expect(getByText('Password is required.')).toBeTruthy();
    });
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
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
      expect(getByText('Please enter a valid email address.')).toBeTruthy();
    });
  });

  it('logs in and navigates on valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({});

    const { getByPlaceholderText, getByTestId } = render(
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

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    jest.advanceTimersByTime(500);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Login Successful!',
        }),
      );
      expect(mockReplace).toHaveBeenCalledWith('Tabs');
    });
  });

  it('shows specific error message on login failure', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });

    const { getByPlaceholderText, getByTestId, getByText } = render(
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
      expect(getByText('Incorrect password.')).toBeTruthy();
    });
  });

  it('navigates to Register screen', () => {
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
});
