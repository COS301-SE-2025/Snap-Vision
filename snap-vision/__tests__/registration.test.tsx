import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterForm from '../src/components/organisms/RegisterForm';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { BadgeProvider } from '../src/context/BadgeContext'; 
const mockCreateUser = jest.fn();

jest.mock('@react-native-firebase/auth', () => () => ({
  createUserWithEmailAndPassword: mockCreateUser,
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

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


  jest.mock('@react-native-firebase/firestore', () => () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      onSnapshot: jest.fn(),
    })),
  }));

  jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
      ...actualNav,
      useNavigation: () => ({
        navigate: jest.fn(),
        replace: jest.fn(), // <-- Add this line
      }),
    };
  });



jest.spyOn(Alert, 'alert');

describe('RegisterForm', () => {
  const setup = () =>
    render(
       <BadgeProvider>
      <ThemeProviderWrapper>
        <NavigationContainer>
          <RegisterForm />
        </NavigationContainer>
      </ThemeProviderWrapper>
    </BadgeProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input fields and buttons', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    expect(getByTestId('register-button')).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
  });

  it('shows alert if fields are empty', () => {
    const { getByTestId } = setup();
    fireEvent.press(getByTestId('register-button'));
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
  });

  it('shows alert for invalid email format', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

    fireEvent.press(getByTestId('register-button'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
  });

  it('shows alert for weak password', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'weak');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'weak');

    fireEvent.press(getByTestId('register-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      expect.stringContaining('Password must be at least 8 characters')
    );
  });

  it('shows alert if passwords do not match', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Mismatch123');

    fireEvent.press(getByTestId('register-button'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
  });

  it('calls Firebase auth and navigates on success', async () => {
  mockCreateUser.mockResolvedValueOnce({ user: { uid: 'test123' } });

  const { getByPlaceholderText, getByTestId } = setup();

  fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
  fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
  fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
  fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

  fireEvent.press(getByTestId('register-button'));

  await waitFor(() => {
    expect(mockCreateUser).toHaveBeenCalledWith('john@example.com', 'Strong@123');
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Account created!');
  });
});

  it('shows Firebase error if email already in use', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'auth/email-already-in-use' });

    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Registration Error',
        'This email is already registered.'
      );
    });
  });
});