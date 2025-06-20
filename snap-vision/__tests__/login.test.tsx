import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginForm from '../src/components/organisms/LoginForm';
import { Alert } from 'react-native';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { DeepLinkProvider } from '../src/DeepLinkContext';

// Mock Firebase auth
const mockSignIn = jest.fn();
jest.mock('@react-native-firebase/auth', () => {
  return jest.fn(() => ({
    signInWithEmailAndPassword: mockSignIn,
  }));
});

// Mock navigation with replace method
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: mockReplace,
  }),
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
      <ThemeProviderWrapper>
        <LoginForm />
      </ThemeProviderWrapper>
    );
    
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ThemeProviderWrapper>
        <LoginForm />
      </ThemeProviderWrapper>
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
      <ThemeProviderWrapper>
        <DeepLinkProvider>
          <LoginForm />
        </DeepLinkProvider>
      </ThemeProviderWrapper>
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
      <ThemeProviderWrapper>
        <LoginForm />
      </ThemeProviderWrapper>
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
      <ThemeProviderWrapper>
        <LoginForm />
      </ThemeProviderWrapper>
    );
    
    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  
});