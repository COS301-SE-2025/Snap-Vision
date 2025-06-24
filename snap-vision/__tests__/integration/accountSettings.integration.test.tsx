import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import AccountSettingsScreen from '../../src/screens/AccountSettings';
import { TestWrapper } from '../helpers/TestWrapper';
import { connectToEmulators, createTestUser, cleanupTestData } from '../helpers/firebase-emulator-config';

// Mock the AccountInfoField component - use requireActual to access React Native components
jest.mock('../../src/components/atoms/AccountInfoField', () => {
  const RN = jest.requireActual('react-native');
  return function MockedAccountInfoField({ label, value }) {
    return (
      <RN.View testID={`account-info-${label}`}>
        <RN.Text>{label}: {value}</RN.Text>
      </RN.View>
    );
  };
});

// Mock LogoutButton component - use requireActual to access React Native components
jest.mock('../../src/components/molecules/LogoutButton', () => {
  const RN = jest.requireActual('react-native');
  return function MockedLogoutButton({ onLogout }) {
    return (
      <RN.TouchableOpacity onPress={onLogout} testID="logout-button">
        <RN.Text>Log Out</RN.Text>
      </RN.TouchableOpacity>
    );
  };
});

// Mock AccountDetails component
jest.mock('../../src/components/molecules/AccountDetails', () => {
  const RN = jest.requireActual('react-native');
  return function MockedAccountDetails() {
    return (
      <RN.View testID="account-details">
        <RN.Text>Mocked Account Details</RN.Text>
      </RN.View>
    );
  };
});

// Mock SettingsHeader component
jest.mock('../../src/components/molecules/SettingsHeader', () => {
  const RN = jest.requireActual('react-native');
  return function MockedSettingsHeader({ title }) {
    return (
      <RN.View testID={`settings-header-${title}`}>
        <RN.Text>{title}</RN.Text>
      </RN.View>
    );
  };
});

// Spy on Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Account Settings Integration Tests', () => {
  let testUser;
  
  beforeAll(() => {
    connectToEmulators();
  });
  
  beforeEach(async () => {
    jest.clearAllMocks();
    testUser = await createTestUser('test@example.com', 'password123');
  });
  
  afterEach(async () => {
    if (testUser?.uid) {
      await cleanupTestData(testUser.uid);
    }
  });

  it('handles logout functionality', async () => {
    const props = {
      navigation: { navigate: jest.fn() }
    };
    
    const { getByTestId } = render(
      <TestWrapper>
        <AccountSettingsScreen {...props} />
      </TestWrapper>
    );
    
    // Wait for the component to load and find the logout button
    await waitFor(() => {
      expect(getByTestId('logout-button')).toBeTruthy();
    });

    // Press the logout button (outside of waitFor)
    fireEvent.press(getByTestId('logout-button'));
    
    // Verify auth().signOut was called
    await waitFor(() => {
      expect(auth().signOut).toHaveBeenCalled();
    });
    
    // Verify Alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringMatching(/logged ?out/i), 
      expect.any(String)
    );
  });
});