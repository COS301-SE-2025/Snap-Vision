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
  selectedPOI: any | null;
  availablePOIs: any[];
  onChangeDensity: (density: string) => void;
  onChangePOI: (poi: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const CrowdReportModal: React.FC<CrowdReportModalProps> = ({
  visible,
  selectedDensity,
  selectedPOI,
  availablePOIs,
  onChangeDensity,
  onChangePOI,
  onSubmit,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const densityOptions = [
    { value: 'empty', label: 'Empty', icon: '🟢', description: 'Few people around' },
    { value: 'light', label: 'Light Crowd', icon: '🟡', description: 'Some people present' },
    { value: 'moderate', label: 'Moderate Crowd', icon: '🟠', description: 'Quite crowded' },
    { value: 'crowded', label: 'Very High Crowd', icon: '🔴', description: 'Extremely crowded' },
    { value: 'overcrowded', label: 'Overcrowded', icon: '⚫', description: 'Dangerously packed' },
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

          {/* Building Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Building
            </Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <Picker
                selectedValue={selectedPOI ? selectedPOI.id : ''}
                onValueChange={(itemValue) => {
                  const poi = availablePOIs.find(p => p.id === itemValue);
                  onChangePOI(poi || null);
                }}
                style={{ color: colors.text }}
              >
                <Picker.Item label="Select a building..." value="" />
                {availablePOIs
                  .filter(poi => poi.name) // Only show POIs with names
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(poi => (
                    <Picker.Item key={poi.id} label={poi.name || poi.id} value={poi.id} />
                  ))
                }
              </Picker>
            </View>
          </View>

          {/* Density Options */}
          <View style={styles.optionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Crowd Level
            </Text>
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
                { 
                  backgroundColor: colors.primary,
                  opacity: !selectedPOI || !selectedDensity ? 0.5 : 1 
                }
              ]}
              onPress={onSubmit}
              disabled={!selectedPOI || !selectedDensity}
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
  section: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
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