import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import StyledTextInput from '../atoms/StyledTextInput';

interface QRCodeGeneratorProps {
  qrValue: string;
  setQrValue: (value: string) => void;
  onGenerate: () => void;
  onSavePNG?: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  qrValue,
  setQrValue,
  onGenerate,
  onSavePNG,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const qrRef = useRef<QRCode | null>(null);

  return (
    <View>
      <Text style={[styles.label, { color: colors.text }]}>QR Code Value</Text>
      
      <View style={styles.qrValueContainer}>
        <StyledTextInput
          value={qrValue}
          onChangeText={setQrValue}
          placeholder="Enter QR code value"
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: colors.primary }]}
          onPress={onGenerate}
        >
          <Text style={styles.generateButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>

      {qrValue && (
        <View style={styles.qrPreview}>
          <View style={styles.qrCard}>
            <QRCode
              value={qrValue}
              size={200}
              color="#000000"
              backgroundColor="#FFFFFF"
              getRef={(c) => (qrRef.current = c)}
            />
          </View>
          <Text style={[styles.qrValueText, { color: colors.text }]} numberOfLines={2}>
            {qrValue}
          </Text>
          
          {onSavePNG && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={onSavePNG}
            >
              <Text style={styles.saveButtonText}>Save PNG</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  qrValueContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  generateButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  qrPreview: {
    alignItems: 'center',
    marginTop: 16,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  qrValueText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
});

export default QRCodeGenerator;
