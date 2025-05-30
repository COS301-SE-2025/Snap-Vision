import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login'; // Adjusted import path
import { Alert } from 'react-native';

// Mock Firebase auth
const mockSignIn = jest.fn();
jest.mock('@react-native-firebase/auth', () => {
  return jest.fn(() => ({
    signInWithEmailAndPassword: mockSignIn,
  }));
});

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('LoginScreen', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    mockSignIn.mockClear();
    mockNavigate.mockClear();
  });

  it('shows error when fields are empty', async () => {
    const { getByTestId } = render(<LoginScreen />);
    
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('shows error for invalid email', async () => {
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), '123456');
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('logs in and navigates on valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Logged in!');
      expect(mockNavigate).toHaveBeenCalledWith('Tabs');
    });
  });

  it('shows specific error message on login failure', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpass');    
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect password.');
    });
  });

  it('navigates to Register screen', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('toggles Remember Me', () => {
    const { getByText } = render(<LoginScreen />);
    const rememberMe = getByText(/Remember Me/);
    fireEvent.press(rememberMe);
    expect(rememberMe.props.children).toContain('◉');
  });
});