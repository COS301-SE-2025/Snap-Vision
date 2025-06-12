// src/components/organisms/DirectionsModal.tsx
import React from 'react';
import { Modal, View, FlatList, Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { StyleSheet } from 'react-native';

interface DirectionsModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void; // New prop for start navigation
  destination: string;
  steps: any[];
  currentStep: number;
}

const DirectionsModal: React.FC<DirectionsModalProps> = ({
  visible,
  onClose,
  onStart,
  destination,
  steps,
  currentStep,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Semi-transparent overlay that allows map to be visible */}
      <View style={styles.overlay}>
        {/* Empty view that allows touches to pass through to the map */}
        <Pressable 
          style={styles.mapArea} 
          onPress={onClose}
        />
        
        {/* Modal content */}
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.text }]}>
              Directions to {destination}
            </Text>
          </View>
          
          <FlatList
            data={steps}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item, index }) => (
              <View style={[
                styles.stepContainer,
                index === currentStep && { backgroundColor: colors.primary + '20' }
              ]}>
                <Text style={[
                  styles.stepNumber,
                  { color: index === currentStep ? colors.primary : colors.text }
                ]}>
                  {index + 1}.
                </Text>
                <Text style={[
                  styles.stepText,
                  { color: index === currentStep ? colors.primary : colors.text }
                ]}>
                  {item.instruction}
                </Text>
              </View>
            )}
          />
          
          {/* Button container */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.startButton, { backgroundColor: colors.primary }]}
              onPress={onStart}
            >
              <Text style={styles.buttonText}>Start Navigation</Text>
            </Pressable>
            
            <Pressable
              style={[styles.button, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)' // Semi-transparent dark overlay
  },
  mapArea: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
  },
  stepNumber: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  stepText: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'column',
    marginTop: 16,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  startButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DirectionsModal;