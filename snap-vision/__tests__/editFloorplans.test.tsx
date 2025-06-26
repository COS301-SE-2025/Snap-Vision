//// Mock AsyncStorage first, before any imports
jest.mock('@react-native-async-storage/async-storage', () => ({
    getAllKeys: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => () => ({
    collection: jest.fn(() => ({
        where: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ 
                docs: []
            })),
        })),
        doc: jest.fn(() => ({
            set: jest.fn(() => Promise.resolve()),
            delete: jest.fn(() => Promise.resolve()),
        })),
    })),
    batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
}));

// Mock RNFS
jest.mock('react-native-fs', () => ({
    DocumentDirectoryPath: '/mock/path',
    mkdir: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
}));

// Mock Image Picker
jest.mock('react-native-image-picker', () => ({
    launchImageLibrary: jest.fn(),
}));

// Create a proper navigation mock
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: mockNavigate,
    }),
}));

// Mock the ThemeContext properly
jest.mock('../src/theme/ThemeContext', () => ({
    useTheme: () => ({
        isDark: false,
        toggleTheme: jest.fn(),
    }),
}));

// Mock theme utils
jest.mock('../src/theme', () => ({
    getThemeColors: () => ({
        background: '#ffffff',
        text: '#000000',
        primary: '#007AFF',
        card: '#f8f8f8',
        border: '#e0e0e0',
        danger: '#ff3b30',
    }),
}));

// Mock Ionicons
jest.mock('react-native-vector-icons/Ionicons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return ({ name, size, color, ...props }: any) => 
        React.createElement(Text, { ...props, testID: `icon-${name}` }, name);
});

// Mock components
jest.mock('../src/components/molecules/SettingsHeader', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return ({ title }: any) => React.createElement(Text, { testID: 'settings-header' }, title);
}, { virtual: true });

jest.mock('../src/components/atoms/AppButton', () => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return ({ title, onPress, style }: any) =>
        React.createElement(
            TouchableOpacity,
            { onPress, style, testID: `button-${title.replace(/\s+/g, '-').toLowerCase()}` },
            React.createElement(Text, null, title)
        );
}, { virtual: true });

jest.mock('../src/components/atoms/AppSecondaryButton', () => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return ({ title, onPress, style }: any) =>
        React.createElement(
            TouchableOpacity,
            { onPress, style, testID: `secondary-button-${title.replace(/\s+/g, '-').toLowerCase()}` },
            React.createElement(Text, null, title)
        );
}, { virtual: true });

// Now import everything after mocks are set up
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminEditFloorplansContent from '../src/components/organisms/AdminEditFloorplansContent';

// Get the mocked modules
const mockAsyncStorage = require('@react-native-async-storage/async-storage');

describe('AdminEditFloorplansContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Configure AsyncStorage mock
        mockAsyncStorage.getAllKeys.mockResolvedValue([
            'floorplan_building1_Floor 1',
            'floorplan_building2_Floor 2',
        ]);
        
        mockAsyncStorage.getItem.mockImplementation((key: string) => {
            if (key === 'floorplan_building1_Floor 1') {
                return Promise.resolve(JSON.stringify({
                    buildingId: 'building1',
                    buildingName: 'Main Building',
                    floorLabel: 'Floor 1',
                    timestamp: '2023-01-01T00:00:00.000Z',
                    uri: 'file://path/to/floorplan1.jpg',
                }));
            }
            if (key === 'floorplan_building2_Floor 2') {
                return Promise.resolve(JSON.stringify({
                    buildingId: 'building2',
                    buildingName: 'Secondary Building',
                    floorLabel: 'Floor 2',
                    timestamp: '2023-01-02T00:00:00.000Z',
                    uri: 'file://path/to/floorplan2.jpg',
                }));
            }
            return Promise.resolve(null);
        });
    });

    it('renders loading state initially', () => {
        const { getByText } = render(<AdminEditFloorplansContent />);
        expect(getByText('Loading floorplans...')).toBeTruthy();
    });

    it('loads and displays floorplans from AsyncStorage', async () => {
        const { getByText } = render(<AdminEditFloorplansContent />);
        
        await waitFor(() => {
            expect(getByText('Main Building')).toBeTruthy();
            expect(getByText('Secondary Building')).toBeTruthy();
        });
    });

    it('allows selecting a floorplan', async () => {
        const { getByText } = render(<AdminEditFloorplansContent />);
        
        await waitFor(() => {
            expect(getByText('Main Building')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(getByText('Main Building'));
        });
        
        await waitFor(() => {
            // Check for the selected floorplan details that are actually rendered
            expect(getByText('Building:')).toBeTruthy();
            expect(getByText('Floor:')).toBeTruthy();
            expect(getByText('Last Modified:')).toBeTruthy();
        });
    });

    it('navigates to add new floorplan screen', async () => {
        const { getByTestId } = render(<AdminEditFloorplansContent />);
        
        // Wait for component to load before looking for the button
        await waitFor(() => {
            expect(getByTestId('button-add-new-floorplan')).toBeTruthy();
        });
        
        const addButton = getByTestId('button-add-new-floorplan');
        
        await act(async () => {
            fireEvent.press(addButton);
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
    });
});