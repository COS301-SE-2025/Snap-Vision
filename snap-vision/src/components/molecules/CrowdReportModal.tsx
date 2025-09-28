import React, { useState } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Icon from 'react-native-vector-icons/Ionicons';

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
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const [buildingSearchText, setBuildingSearchText] = useState('');
  const [showBuildingSuggestions, setShowBuildingSuggestions] = useState(false);

  const densityOptions = [
    { value: 'empty', label: 'Empty', icon: '🟢', description: 'Few people around' },
    { value: 'light', label: 'Light Crowd', icon: '🟡', description: 'Some people present' },
    { value: 'moderate', label: 'Moderate Crowd', icon: '🟠', description: 'Quite crowded' },
    { value: 'crowded', label: 'Very High Crowd', icon: '🔴', description: 'Extremely crowded' },
    { value: 'overcrowded', label: 'Overcrowded', icon: '⚫', description: 'Dangerously packed' },
  ];

  // Filter POIs based on search text
  const filteredPOIs = buildingSearchText.trim()
    ? availablePOIs.filter(
        (poi) => poi.name && poi.name.toLowerCase().includes(buildingSearchText.toLowerCase()),
      )
    : [];

  // Determine initial search text based on selected POI
  React.useEffect(() => {
    if (selectedPOI && selectedPOI.name) {
      setBuildingSearchText(selectedPOI.name);
    }
  }, [selectedPOI]);

  // Function to render building suggestions outside of ScrollView
  const renderBuildingSuggestions = () => {
    if (!showBuildingSuggestions || filteredPOIs.length === 0) {
      return null;
    }

    return (
      <View style={[styles.suggestionsOverlay, { top: 180 }]}>
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <FlatList
            data={filteredPOIs}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onChangePOI(item);
                  setBuildingSearchText(item.name);
                  setShowBuildingSuggestions(false);
                  Keyboard.dismiss();
                }}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
              >
                <Text style={{ color: colors.text }}>{item.name}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 200 }}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Report Crowd Density</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Help others by sharing current crowd levels
            </Text>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Building Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Building</Text>

              {/* Search box - styled like DestinationSearch */}
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={buildingSearchText}
                  onChangeText={(text) => {
                    setBuildingSearchText(text);
                    setShowBuildingSuggestions(true);
                  }}
                  placeholder="Search for a building..."
                  placeholderTextColor={isDark ? '#999' : '#666'}
                  onFocus={() => setShowBuildingSuggestions(true)}
                />
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowBuildingSuggestions(true)}
                >
                  <Icon name="search" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Display currently selected building */}
              {selectedPOI && (
                <Text style={[styles.selectedBuilding, { color: colors.primary }]}>
                  Currently selected: {selectedPOI.name}
                </Text>
              )}
            </View>

            {/* Density Options */}
            <View style={styles.optionsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Crowd Level</Text>
              {densityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        selectedDensity === option.value ? colors.primary : colors.card,
                      borderColor:
                        selectedDensity === option.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onChangeDensity(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: selectedDensity === option.value ? '#ffffff' : colors.text,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          {
                            color: selectedDensity === option.value ? '#ffffff' : colors.text,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {selectedDensity === option.value && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Render building suggestions overlay outside of ScrollView */}
          {renderBuildingSuggestions()}

          {/* Action Buttons - Keep outside ScrollView so they're always visible */}
          <View
            style={[styles.buttonContainer, { borderTopWidth: 1, borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                {
                  backgroundColor: 'transparent',
                  borderColor: colors.border,
                },
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.submitButton,
                {
                  backgroundColor: colors.primary,
                  opacity: !selectedPOI || !selectedDensity ? 0.5 : 1,
                },
              ]}
              onPress={onSubmit}
              disabled={!selectedPOI || !selectedDensity}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

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
    maxHeight: height * 0.85,
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 16,
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
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 10,
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
  searchBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 10,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionButton: {
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
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
    fontSize: 13,
  },
  checkmark: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
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
  selectedBuilding: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

export default CrowdReportModal;
