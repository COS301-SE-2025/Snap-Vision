// src/components/molecules/CrowdReportModal.tsx
import React from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { Picker } from '@react-native-picker/picker';


interface CrowdReportModalProps {
  visible: boolean;
  selectedDensity: string;
  onChangeDensity: (density: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const CrowdReportModal: React.FC<CrowdReportModalProps> = ({
  visible,
  selectedDensity,
  onChangeDensity,
  onSubmit,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const densityOptions = [
    { value: 'low', label: 'Low Crowd', icon: '🟢', description: 'Few people around' },
    { value: 'moderate', label: 'Moderate Crowd', icon: '🟡', description: 'Some people present' },
    { value: 'high', label: 'High Crowd', icon: '🟠', description: 'Quite crowded' },
    { value: 'very-high', label: 'Very High Crowd', icon: '🔴', description: 'Extremely crowded' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Report Crowd Density
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Help others by sharing current crowd levels
            </Text>
          </View>

          {/* Density Options */}
          <View style={styles.optionsContainer}>
            {densityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: selectedDensity === option.value 
                      ? colors.primary 
                      : colors.card,
                    borderColor: selectedDensity === option.value 
                      ? colors.primary 
                      : colors.border,
                  }
                ]}
                onPress={() => onChangeDensity(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionLabel,
                      {
                        color: selectedDensity === option.value 
                          ? '#ffffff' 
                          : colors.text
                      }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.optionDescription,
                      {
                        color: selectedDensity === option.value 
                          ? '#ffffff' 
                          : colors.text,
                        opacity: 0.7
                      }
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedDensity === option.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                { 
                  backgroundColor: 'transparent',
                  borderColor: colors.border,
                }
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.submitButton,
                { backgroundColor: colors.primary }
              ]}
              onPress={onSubmit}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>
                Submit Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionButton: {
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 12,
    padding: 15,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  checkmark: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    // Primary color background set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CrowdReportModal;