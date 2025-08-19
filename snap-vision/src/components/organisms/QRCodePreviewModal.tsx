import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface QRCodePreviewModalProps {
  visible: boolean;
  qrValue: string;
  onClose: () => void;
}

const QRCodePreviewModal: React.FC<QRCodePreviewModalProps> = ({ visible, qrValue, onClose }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const qrRef = useRef<QRCode | null>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>QR Code</Text>

          <View style={styles.qrCard}>
            <QRCode
              value={qrValue || ' '}
              size={320}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="M"
              getRef={(c) => (qrRef.current = c)}
            />
          </View>

          <Text style={[styles.qrValueText, { color: colors.text }]} numberOfLines={2}>
            {qrValue}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.fullWidthButton, { backgroundColor: colors.border, flex: 1 }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrValueText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  fullWidthButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default QRCodePreviewModal;
