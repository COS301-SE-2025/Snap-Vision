import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QRCodePreviewModal from '../src/components/organisms/QRCodePreviewModal';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock QRCode component
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => (
      <View testID="qrcode-svg" {...props}>
        <View testID="mock-qrcode" qrValue={props.value} />
      </View>
    ),
  };
});

describe('QRCodePreviewModal', () => {
  const defaultProps = {
    visible: true,
    qrValue: 'qr:loc:1:1:101:test-qr',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText, getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} />
      </ThemeProviderWrapper>,
    );

    expect(getByText('QR Code')).toBeTruthy();
    expect(getByTestId('qrcode-svg')).toBeTruthy();
    expect(getByText(defaultProps.qrValue)).toBeTruthy();
    expect(getByText('Close')).toBeTruthy();

    // Check QR code props
    const mockQRCode = getByTestId('mock-qrcode');
    expect(mockQRCode.props.qrValue).toBe(defaultProps.qrValue);
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} visible={false} />
      </ThemeProviderWrapper>,
    );

    expect(queryByText('QR Code')).toBeNull();
  });

  it('uses default empty space when qrValue is empty', () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} qrValue="" />
      </ThemeProviderWrapper>,
    );

    const mockQRCode = getByTestId('mock-qrcode');
    expect(mockQRCode.props.qrValue).toBe(' '); // The component uses ' ' as default
  });

  it('calls onClose when Close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} onClose={onClose} />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('truncates long QR values in the display', () => {
    const longQRValue =
      'qr:loc:1:1:101:very-long-qr-value-that-might-get-truncated-in-the-ui-to-prevent-overflow-issues';

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} qrValue={longQRValue} />
      </ThemeProviderWrapper>,
    );

    // The text should be present but might be truncated in the UI
    // We're just testing that the component doesn't crash with long values
    expect(getByText(longQRValue)).toBeTruthy();

    // The numberOfLines prop in Text component would handle truncation in the actual UI
  });

  it('handles onRequestClose modal prop', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <ThemeProviderWrapper>
        <QRCodePreviewModal {...defaultProps} onClose={onClose} />
      </ThemeProviderWrapper>,
    );

    // Get Modal component
    const modal = UNSAFE_getByType('Modal');

    // Trigger onRequestClose (simulates back button on Android)
    modal.props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
