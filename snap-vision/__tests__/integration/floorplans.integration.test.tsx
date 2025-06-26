import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
//const { forwardRef, useImperativeHandle } = require('react');
//const { View, Text } = require('react-native');
const AdminEditFloorplansScreen = require('../../src/screens/AdminEditFloorplansScreen').default;
const AdminLoadFloorplansScreen = require('../../src/screens/AdminLoadFloorplansScreen').default;
const AdminFloorplanEditorScreen = require('../../src/screens/AdminFloorplanEditorScreen').default;

// Setup mock functions
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockInjectJavaScript = jest.fn();

// Spy on Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// --- Firebase Mocks ---
const mockFirestore = {
    collection: jest.fn(() => ({
        where: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
                docs: [
                    {
                        id: 'building1',
                        data: () => ({
                            name: 'Science Hall',
                            type: 'building',
                            centroid: { latitude: 10.1, longitude: 20.1 }
                        })
                    },
                    {
                        id: 'building2',
                        data: () => ({
                            name: 'Engineering Building',
                            type: 'building',
                            centroid: { latitude: 10.2, longitude: 20.2 }
                        })
                    }
                ]
            }))
        })),
        doc: jest.fn(() => ({
            set: jest.fn(() => Promise.resolve()),
            delete: jest.fn(() => Promise.resolve()),
            get: jest.fn(() => Promise.resolve({
                exists: true,
                data: () => ({
                    rooms: {
                        'room1': { name: 'Room 101', x: 100, y: 150 },
                        'room2': { name: 'Room 102', x: 200, y: 250 }
                    }
                })
            }))
        }))
    })),
    batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve())
    }))
};

jest.mock('@react-native-firebase/firestore', () => () => mockFirestore);

// --- AsyncStorage Mock ---
const mockAsyncStorage = {
    getAllKeys: jest.fn(() => Promise.resolve([
        'floorplan_building1_Floor_1',
        'floorplan_building2_Floor_2'
    ])),
    getItem: jest.fn((key) => {
        const mockData = {
            'floorplan_building1_Floor_1': JSON.stringify({
                uri: 'file:///mock/floorplan1.jpg',
                timestamp: '2024-01-01T00:00:00.000Z'
            }),
            'floorplan_building2_Floor_2': JSON.stringify({
                uri: 'file:///mock/floorplan2.jpg',
                timestamp: '2024-01-02T00:00:00.000Z'
            })
        };
        return Promise.resolve(mockData[key] || null);
    }),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve())
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// --- React Native FS Mock ---
const mockRNFS = {
    DocumentDirectoryPath: '/mock/path',
    mkdir: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve())
};

jest.mock('react-native-fs', () => mockRNFS);

// --- Image Picker Mock ---
const mockImagePicker = {
    launchImageLibrary: jest.fn(() => Promise.resolve({
        didCancel: false,
        assets: [{
            uri: 'file:///mock/selected-image.jpg',
            type: 'image/jpeg'
        }]
    }))
};

jest.mock('react-native-image-picker', () => mockImagePicker);

// --- Navigation Mock ---
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: mockNavigate,
        goBack: mockGoBack
    }),
    useRoute: () => ({
        params: {
            buildingId: 'building1',
            floorLabel: 'Floor 1',
            imageUri: 'file:///mock/image.jpg'
        }
    })
}));

// --- WebView Mock ---
jest.mock('react-native-webview', () => {
    const React = require('react');
    const { forwardRef, useImperativeHandle } = React;
    const { View } = require('react-native');

    const WebView = forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({
            injectJavaScript: mockInjectJavaScript
        }));
        return React.createElement(View, { ...props, testID: 'mocked-webview' });
    });
    WebView.displayName = 'WebView';
    return { WebView };
});

// --- Theme Mock ---
jest.mock('../../src/theme/ThemeContext', () => ({
    useTheme: () => ({ isDark: false })
}));

jest.mock('../../src/theme', () => ({
    getThemeColors: () => ({
        background: '#FFFFFF',
        text: '#000000',
        primary: '#1E88E5',
        secondary: '#4CAF50',
        border: '#DDDDDD',
        surface: '#F5F5F5',
        error: '#F44336'
    })
}));

// --- Component Mocks ---
jest.mock('../../src/components/molecules/SettingsHeader', () => {
    const React = require('react');
    const { View, Text } = require('react-native');
    
    return function MockSettingsHeader({ title }) {
        return (
            <View testID="settings-header">
                <Text>{title}</Text>
            </View>
        );
    };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-modal', () => {
    const React = require('react');
    const { View } = require('react-native');
    
    return ({ isVisible, children, ...props }) => {
        if (!isVisible) return null;
        return React.createElement(View, { ...props, testID: 'modal' }, children);
    };
});

// --- Screen Imports ---

const TestWrapper = ({ children }) => <>{children}</>;

describe('Floorplans Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AdminEditFloorplansScreen Integration', () => {
        it('loads and displays floorplans from AsyncStorage and Firestore', async () => {
            const { getByText, queryByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            // Initially shows loading
            expect(getByText('Loading floorplans...')).toBeTruthy();

            // Wait for data to load
            await waitFor(() => {
                expect(queryByText('Loading floorplans...')).toBeFalsy();
                expect(getByText('Science Hall')).toBeTruthy();
                expect(getByText('Engineering Building')).toBeTruthy();
            });
        });

        it('navigates to add new floorplan screen when button is pressed', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Add New Floorplan')).toBeTruthy();
            });

            fireEvent.press(getByText('Add New Floorplan'));
            expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
        });

        it('selects floorplan and shows action buttons', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Science Hall')).toBeTruthy();
            });

            // Select a floorplan
            fireEvent.press(getByText('Science Hall'));

            await waitFor(() => {
                expect(getByText('Upload Updated Floorplan')).toBeTruthy();
                expect(getByText('Edit Room POIs')).toBeTruthy();
                expect(getByText('Delete Floorplan')).toBeTruthy();
            });
        });

        it('uploads updated floorplan successfully', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                fireEvent.press(getByText('Science Hall'));
            });

            await waitFor(() => {
                expect(getByText('Upload Updated Floorplan')).toBeTruthy();
            });

            fireEvent.press(getByText('Upload Updated Floorplan'));

            await waitFor(() => {
                expect(mockImagePicker.launchImageLibrary).toHaveBeenCalled();
                expect(mockRNFS.mkdir).toHaveBeenCalled();
                expect(mockRNFS.copyFile).toHaveBeenCalled();
                expect(mockAsyncStorage.setItem).toHaveBeenCalled();
                expect(Alert.alert).toHaveBeenCalledWith('Success', 'Floorplan updated successfully');
            });
        });

        it('navigates to floorplan editor when editing rooms', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                fireEvent.press(getByText('Science Hall'));
            });

            await waitFor(() => {
                expect(getByText('Edit Room POIs')).toBeTruthy();
            });

            fireEvent.press(getByText('Edit Room POIs'));

            expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
                buildingId: 'building1',
                floorLabel: 'Floor 1',
                imageUri: 'file:///mock/floorplan1.jpg'
            });
        });

        it('shows confirmation dialog and deletes floorplan', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                fireEvent.press(getByText('Science Hall'));
            });

            await waitFor(() => {
                expect(getByText('Delete Floorplan')).toBeTruthy();
            });

            fireEvent.press(getByText('Delete Floorplan'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Delete Floorplan',
                'Are you sure you want to delete this floorplan? This will also delete all associated room POIs.',
                expect.any(Array)
            );
        });
    });

    describe('AdminLoadFloorplansScreen Integration', () => {
        it('renders upload form with building selection', async () => {
            const { getByText, getByTestId } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Load New Floorplan')).toBeTruthy();
                expect(getByText('Select Building')).toBeTruthy();
                expect(getByText('Floor Label')).toBeTruthy();
                expect(getByText('Select Floorplan Image')).toBeTruthy();
            });
        });

        it('loads buildings from Firestore and displays them', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Science Hall')).toBeTruthy();
                expect(getByText('Engineering Building')).toBeTruthy();
            });

            expect(mockFirestore.collection).toHaveBeenCalledWith('locations');
        });

        it('allows manual building entry when "Other" is selected', async () => {
            const { getByText, getByDisplayValue } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Other (Manual Entry)')).toBeTruthy();
            });

            fireEvent.press(getByText('Other (Manual Entry)'));

            await waitFor(() => {
                expect(getByDisplayValue('Enter building name...')).toBeTruthy();
            });
        });

        it('opens image picker when selecting floorplan image', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Choose Image')).toBeTruthy();
            });

            fireEvent.press(getByText('Choose Image'));

            expect(mockImagePicker.launchImageLibrary).toHaveBeenCalled();
        });

        it('uploads floorplan successfully with all required fields', async () => {
            const { getByText, getByDisplayValue } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            // Select building
            await waitFor(() => {
                fireEvent.press(getByText('Science Hall'));
            });

            // Enter floor label
            const floorInput = getByDisplayValue('e.g., Floor 1, Ground Floor');
            fireEvent.changeText(floorInput, 'Floor 3');

            // Select image
            fireEvent.press(getByText('Choose Image'));

            await waitFor(() => {
                expect(getByText('Upload Floorplan')).toBeTruthy();
            });

            fireEvent.press(getByText('Upload Floorplan'));

            await waitFor(() => {
                expect(mockRNFS.mkdir).toHaveBeenCalled();
                expect(mockRNFS.copyFile).toHaveBeenCalled();
                expect(mockAsyncStorage.setItem).toHaveBeenCalled();
                expect(Alert.alert).toHaveBeenCalledWith('Success', 'Floorplan uploaded successfully');
                expect(mockGoBack).toHaveBeenCalled();
            });
        });

        it('shows error when required fields are missing', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Upload Floorplan')).toBeTruthy();
            });

            fireEvent.press(getByText('Upload Floorplan'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Missing Information',
                'Please fill in all required fields and select an image.'
            );
        });
    });

    describe('AdminFloorplanEditorScreen Integration', () => {
        it('renders floorplan editor with WebView', async () => {
            const { getByTestId, getByText } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Edit Room POIs')).toBeTruthy();
                expect(getByTestId('mocked-webview')).toBeTruthy();
                expect(getByText('Done')).toBeTruthy();
            });
        });

        it('loads existing room POIs from Firestore', async () => {
            const { getByTestId } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockFirestore.collection).toHaveBeenCalledWith('floorplans');
                expect(mockInjectJavaScript).toHaveBeenCalledWith(
                    expect.stringContaining('loadExistingPOIs')
                );
            });
        });

        it('handles adding new room POI', async () => {
            const { getByTestId } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            const webView = getByTestId('mocked-webview');

            // Simulate WebView message for adding new marker
            const addMarkerMessage = {
                nativeEvent: {
                    data: JSON.stringify({
                        type: 'markerAdded',
                        x: 100,
                        y: 200
                    })
                }
            };

            fireEvent(webView, 'onMessage', addMarkerMessage);

            await waitFor(() => {
                expect(getByText('Add Room POI')).toBeTruthy();
            });
        });

        it('saves new room POI to Firestore', async () => {
            const { getByTestId, getByText, getByDisplayValue } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            // Trigger add marker flow
            const webView = getByTestId('mocked-webview');
            fireEvent(webView, 'onMessage', {
                nativeEvent: {
                    data: JSON.stringify({
                        type: 'markerAdded',
                        x: 100,
                        y: 200
                    })
                }
            });

            await waitFor(() => {
                const roomInput = getByDisplayValue('Enter room name...');
                fireEvent.changeText(roomInput, 'Room 103');
            });

            fireEvent.press(getByText('Save'));

            await waitFor(() => {
                expect(mockFirestore.collection).toHaveBeenCalledWith('floorplans');
                expect(Alert.alert).toHaveBeenCalledWith('Success', 'Room POI saved successfully');
            });
        });

        it('navigates back when Done is pressed', async () => {
            const { getByText } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Done')).toBeTruthy();
            });

            fireEvent.press(getByText('Done'));
            expect(mockGoBack).toHaveBeenCalled();
        });

        it('handles delete room POI with confirmation', async () => {
            const { getByTestId } = render(
                <TestWrapper>
                    <AdminFloorplanEditorScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            const webView = getByTestId('mocked-webview');

            // Simulate WebView message for editing existing marker
            fireEvent(webView, 'onMessage', {
                nativeEvent: {
                    data: JSON.stringify({
                        type: 'markerClicked',
                        markerId: 'room1',
                        roomName: 'Room 101'
                    })
                }
            });

            await waitFor(() => {
                expect(getByText('Delete')).toBeTruthy();
            });

            fireEvent.press(getByText('Delete'));

            expect(Alert.alert).toHaveBeenCalledWith(
                'Delete Room POI',
                'Are you sure you want to delete "Room 101"?',
                expect.any(Array)
            );
        });
    });

    describe('Error Handling Integration', () => {
        it('handles AsyncStorage errors gracefully', async () => {
            mockAsyncStorage.getAllKeys.mockRejectedValueOnce(new Error('Storage error'));

            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Failed to load floorplans: Storage error')).toBeTruthy();
            });
        });

        it('handles Firestore errors gracefully', async () => {
            mockFirestore.collection.mockImplementationOnce(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => Promise.reject(new Error('Firestore error')))
                }))
            }));

            const { getByText } = render(
                <TestWrapper>
                    <AdminLoadFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(getByText('Failed to load buildings: Firestore error')).toBeTruthy();
            });
        });

        it('handles image picker cancellation', async () => {
            mockImagePicker.launchImageLibrary.mockResolvedValueOnce({
                didCancel: true
            });

            const { getByText } = render(
                <TestWrapper>
                    <AdminEditFloorplansScreen navigation={{ navigate: mockNavigate }} />
                </TestWrapper>
            );

            await waitFor(() => {
                fireEvent.press(getByText('Science Hall'));
            });

            await waitFor(() => {
                fireEvent.press(getByText('Upload Updated Floorplan'));
            });

            // Should not show success alert when cancelled
            expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.any(String));
        });
    });
});