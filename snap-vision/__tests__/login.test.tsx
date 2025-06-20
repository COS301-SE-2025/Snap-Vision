// __tests__/login.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginForm from '../src/components/organisms/LoginForm';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { DeepLinkProvider } from '../src/DeepLinkContext';

// Import the mock and access the mock function from it
import auth from '@react-native-firebase/auth';
const mockSignInWithEmailAndPassword = (auth as any).mockSignInWithEmailAndPassword;

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

// Mock DeepLinkContext
jest.mock('../src/DeepLinkContext', () => {
  const original = jest.requireActual('../src/DeepLinkContext');
  return {
    ...original,
    useDeepLink: () => ({
      coords: null,
      setCoords: jest.fn(),
    }),
  };
});

// Spy on Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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

  const renderLogin = () =>
    render(
      <ThemeProviderWrapper>
        <DeepLinkProvider>
          <LoginForm />
        </DeepLinkProvider>
      </ThemeProviderWrapper>
    );

  it('shows error when fields are empty', async () => {
    const { getByTestId } = renderLogin();
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123456');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('logs in and navigates on valid credentials', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByTestId, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    jest.advanceTimersByTime(500);
    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(getByText('Login successful!')).toBeTruthy();
      expect(mockReplace).toHaveBeenCalledWith('Tabs');
    });
  });

  it('shows specific error message on login failure', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const { getByPlaceholderText, getByTestId } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpass');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect password.');
    });
  });

  it('navigates to Register screen', () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to Forgot Password screen', () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText(/Forgot Password/i));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('displays success message after successful login', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByTestId, getByText } = renderLogin();
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByTestId('login-button'));
    jest.advanceTimersByTime(500);
    await waitFor(() => {
      expect(getByText('Login successful!')).toBeTruthy();
    });
  });
});
