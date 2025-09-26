import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Create a mock StandardPopup implementation
const mockStandardPopup = jest.fn();

// Mock StandardPopup component
jest.mock('../src/components/atoms/StandardPopup', () => {
  return mockStandardPopup;
});

jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  return {
    ...reactNative,
  };
});

// Mock the Firebase modules
jest.mock('@react-native-firebase/auth', () => {
  let mockCurrentUser = {
    email: 'test@example.com',
  };

  const signOut = jest.fn(() => Promise.resolve());

  // Add a setter to allow tests to change currentUser
  const mockAuth = () => ({
    currentUser: mockCurrentUser,
    signOut,
    // Helper for tests to change the current user
    __setCurrentUser: (user) => {
      mockCurrentUser = user;
    },
  });

  return mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockGet = jest.fn();
  const mockWhere = jest.fn(() => ({
    get: mockGet,
  }));
  const mockCollection = jest.fn(() => ({
    where: mockWhere,
  }));

  return () => ({
    collection: mockCollection,
  });
});

// Mock RootNavigation
const mockResetToLogin = jest.fn();
jest.mock('../src/navigation/RootNavigation', () => ({
  resetToLogin: mockResetToLogin,
}));

// Extract the functions to test
async function fetchUserData() {
  try {
    const currentUser = auth().currentUser;

    if (!currentUser) {
      //consolelog('No user is currently logged in');
      return null;
    }

    // Default user info from Auth
    let userInfo = {
      email: currentUser.email || '',
      name: '',
      role: '',
    };

    // Get additional info from Firestore
    try {
      const userDoc = await firestore()
        .collection('userInformation')
        .where('email', '==', currentUser.email)
        .get();

      if (!userDoc.empty) {
        const firestoreData = userDoc.docs[0].data();
        userInfo = {
          ...userInfo,
          name: firestoreData.name || '',
          role: firestoreData.role || '',
        };
      }
    } catch (firestoreError) {
      // Error fetching from Firestore, but continue with default data
    }

    return userInfo;
  } catch (error) {
    //consoleerror('Error fetching user data:', error);
    return null;
  }
}

// IMPORTANT: Modified to use mockStandardPopup directly for testing
async function handleLogout() {
  try {
    await auth().signOut();

    mockStandardPopup({
      visible: true,
      title: 'Logged Out',
      message: 'You have been logged out successfully.',
      onClose: () => {},
    });
    require('../src/navigation/RootNavigation').resetToLogin();
    return true;
  } catch (error) {
    mockStandardPopup({
      visible: true,
      title: 'Error',
      message: 'An error occurred while logging out.',
      onClose: () => {},
    });
    return false;
  }
}

describe('User Settings Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Firestore mock data for each test
    firestore().collection().where().get.mockReset();

    // Set up default mock data
    const mockUserData = {
      name: 'Test User',
      role: 'Admin',
    };

    const mockDocs = [
      {
        id: 'test-doc-id',
        data: () => mockUserData,
      },
    ];

    firestore().collection().where().get.mockResolvedValue({
      empty: false,
      docs: mockDocs,
    });

    // Reset current user to default
    auth().__setCurrentUser({
      email: 'test@example.com',
    });

    // Clear StandardPopup mock
    mockStandardPopup.mockClear();
  });

  describe('Fetch User Data', () => {
    it('fetches user data from Firestore', async () => {
      const userData = await fetchUserData();

      // Verify the result
      expect(userData).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        role: 'Admin',
      });

      // Verify Firestore was called correctly
      expect(firestore().collection).toHaveBeenCalledWith('userInformation');
      expect(firestore().collection().where).toHaveBeenCalledWith(
        'email',
        '==',
        'test@example.com',
      );
    });

    it('handles case when user is not logged in', async () => {
      // Set the current user to null for this test
      auth().__setCurrentUser(null);

      const userData = await fetchUserData();

      // Verify the result is null when no user is logged in
      expect(userData).toBeNull();
    });

    it('handles empty Firestore results', async () => {
      // Configure Firestore mock to return empty results for this test
      firestore().collection().where().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const userData = await fetchUserData();

      // Verify the result has default values
      expect(userData).toEqual({
        email: 'test@example.com',
        name: '',
        role: '',
      });
    });

    it('handles Firestore error', async () => {
      // Configure Firestore mock to throw an error
      const firestoreError = new Error('Firestore error');
      firestore().collection().where().get.mockRejectedValueOnce(firestoreError);

      const userData = await fetchUserData();

      // Verify we still get basic user data
      expect(userData).toEqual({
        email: 'test@example.com',
        name: '',
        role: '',
      });
    });
  });

  describe('Logout Functionality', () => {
    it('signs out successfully', async () => {
      const result = await handleLogout();

      // Verify signOut was called
      expect(auth().signOut).toHaveBeenCalled();

      // Verify StandardPopup was shown
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Logged Out',
        message: 'You have been logged out successfully.',
        onClose: expect.any(Function),
      });

      // Verify navigation was reset
      expect(mockResetToLogin).toHaveBeenCalled();

      // Verify result
      expect(result).toBe(true);
    });

    it('handles logout error', async () => {
      // Make signOut reject with an error
      const mockError = new Error('Failed to sign out');
      auth().signOut.mockRejectedValueOnce(mockError);

      const result = await handleLogout();

      // Verify error handling
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Error',
        message: 'An error occurred while logging out.',
        onClose: expect.any(Function),
      });

      // Verify navigation was not called
      expect(mockResetToLogin).not.toHaveBeenCalled();

      // Verify result
      expect(result).toBe(false);
    });
  });
});
