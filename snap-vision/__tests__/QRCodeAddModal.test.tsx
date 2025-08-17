import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QRCodeAddModal from '../src/components/organisms/QRCodeAddModal';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock RoomSelector component
jest.mock('../src/components/molecules/RoomSelector', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ rooms, selectedRoom, searchQuery, onSearchQueryChange, onRoomSelect }) => (
      <View testID="room-selector">
        <TextInput
          testID="room-search-input"
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder="Search rooms"
        />
        {rooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            testID={`room-item-${room.id}`}
            onPress={() => onRoomSelect(room)}
            style={{
              backgroundColor: selectedRoom?.id === room.id ? '#e0e0e0' : 'transparent',
            }}
          >
            <Text>{room.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

// Mock QRCodeGenerator component
jest.mock('../src/components/molecules/QRCodeGenerator', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ qrValue, setQrValue, onGenerate }) => (
      <View testID="qr-generator">
        <TextInput
          testID="qr-value-input"
          value={qrValue}
          onChangeText={setQrValue}
          placeholder="QR Code Value"
        />
        <TouchableOpacity testID="generate-qr-button" onPress={onGenerate}>
          <Text>Generate QR Code</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock StyledTextInput component
jest.mock('../src/components/atoms/StyledTextInput', () => {
  const React = require('react');
  const { View, Text, TextInput } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, value, onChangeText, placeholder }) => (
      <View testID="styled-text-input">
        <Text>{label}</Text>
        <TextInput
          testID="description-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
      </View>
    ),
  };
});

describe('QRCodeAddModal', () => {
  const mockRooms = [
    { id: 'rm1', name: 'Room 101', floorId: 'flr1', buildingId: 'bld1', buildingName: 'Building 1' },
    { id: 'rm2', name: 'Room 102', floorId: 'flr1', buildingId: 'bld1', buildingName: 'Building 1' },
  ];

  const defaultProps = {
    visible: true,
    rooms: mockRooms,
    selectedRoom: null,
    onRoomSelect: jest.fn(),
    searchQuery: '',
    onSearchQueryChange: jest.fn(),
    qrValue: '',
    onQrValueChange: jest.fn(),
    qrDescription: '',
    onQrDescriptionChange: jest.fn(),
    onGenerateQR: jest.fn(),
    onAdd: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText, getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} />
      </ThemeProviderWrapper>
    );

    expect(getByText('Add New QR Code')).toBeTruthy();
    expect(getByTestId('room-selector')).toBeTruthy();
    expect(getByTestId('qr-generator')).toBeTruthy();
    expect(getByTestId('styled-text-input')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Add')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} visible={false} />
      </ThemeProviderWrapper>
    );

    expect(queryByText('Add New QR Code')).toBeNull();
  });

  it('calls onRoomSelect when a room is selected', () => {
    const onRoomSelect = jest.fn();
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onRoomSelect={onRoomSelect} />
      </ThemeProviderWrapper>
    );

    fireEvent.press(getByTestId('room-item-rm1'));
    expect(onRoomSelect).toHaveBeenCalledWith(mockRooms[0]);
  });

  it('updates search query when text is entered', () => {
    const onSearchQueryChange = jest.fn();
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onSearchQueryChange={onSearchQueryChange} />
      </ThemeProviderWrapper>
    );

    fireEvent.changeText(getByTestId('room-search-input'), 'room');
    expect(onSearchQueryChange).toHaveBeenCalledWith('room');
  });

  it('calls onQrValueChange when QR value is entered', () => {
    const onQrValueChange = jest.fn();
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onQrValueChange={onQrValueChange} />
      </ThemeProviderWrapper>
    );

    fireEvent.changeText(getByTestId('qr-value-input'), 'qr:test:value');
    expect(onQrValueChange).toHaveBeenCalledWith('qr:test:value');
  });

  it('calls onGenerateQR when Generate button is pressed', () => {
    const onGenerateQR = jest.fn();
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onGenerateQR={onGenerateQR} />
      </ThemeProviderWrapper>
    );

    fireEvent.press(getByTestId('generate-qr-button'));
    expect(onGenerateQR).toHaveBeenCalledTimes(1);
  });

  it('calls onQrDescriptionChange when description is entered', () => {
    const onQrDescriptionChange = jest.fn();
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onQrDescriptionChange={onQrDescriptionChange} />
      </ThemeProviderWrapper>
    );

    fireEvent.changeText(getByTestId('description-input'), 'Test description');
    expect(onQrDescriptionChange).toHaveBeenCalledWith('Test description');
  });

  it('calls onAdd when Add button is pressed', () => {
    const onAdd = jest.fn();
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onAdd={onAdd} />
      </ThemeProviderWrapper>
    );

    fireEvent.press(getByText('Add'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} onClose={onClose} />
      </ThemeProviderWrapper>
    );

    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays selected room correctly', () => {
    const selectedRoom = mockRooms[0];
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...defaultProps} selectedRoom={selectedRoom} />
      </ThemeProviderWrapper>
    );

    // The room-item-rm1 should have a different style indicating it's selected
    const roomItem = getByTestId('room-item-rm1');
    expect(roomItem.props.style).toHaveProperty('backgroundColor', '#e0e0e0');
  });

  it('passes correct props to child components', () => {
    const props = {
      ...defaultProps,
      searchQuery: 'test query',
      qrValue: 'test:qr:value',
      qrDescription: 'test description',
      selectedRoom: mockRooms[1],
    };

    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeAddModal {...props} />
      </ThemeProviderWrapper>
    );

    // Verify RoomSelector props
    expect(getByTestId('room-search-input').props.value).toBe('test query');

    // Verify QR Generator props
    expect(getByTestId('qr-value-input').props.value).toBe('test:qr:value');

    // Verify Description input props
    expect(getByTestId('description-input').props.value).toBe('test description');

    // Selected room (room 2) should be highlighted
    const roomItem = getByTestId('room-item-rm2');
    expect(roomItem.props.style).toHaveProperty('backgroundColor', '#e0e0e0');
  });
});
