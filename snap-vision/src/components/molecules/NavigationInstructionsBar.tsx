import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NavigationStep } from '../../utils/navigationUtils';

interface NavigationBarProps {
  visible: boolean;
  currentStep: NavigationStep | null;
  stepNumber: number;
  totalSteps: number;
  destination: string;
  onShowAllDirections: () => void;
  onStopNavigation: () => void;
  themeColors: any;
}

const NavigationInstructionsBar: React.FC<NavigationBarProps> = ({
  visible,
  currentStep,
  stepNumber,
  totalSteps,
  destination,
  onShowAllDirections,
  onStopNavigation,
  themeColors,
}) => {
  if (!visible || !currentStep) return null;

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'start':
        return 'my-location';
      case 'turn':
        return 'turn-right';
      case 'waypoint':
        return 'straight';
      case 'destination':
        return 'place';
      case 'connector':
        return 'stairs';
      default:
        return 'navigation';
    }
  };

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case 'start':
        return themeColors.success;
      case 'destination':
        return themeColors.destination || themeColors.warning;
      case 'connector':
        return themeColors.primary;
      default:
        return themeColors.primary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
      ]}
    >
      {/* Step Icon and Instruction */}
      <View style={styles.instructionContainer}>
        <View style={[styles.iconContainer, { backgroundColor: getStepColor(currentStep.type) }]}>
          <MaterialIcons name={getStepIcon(currentStep.type)} size={20} color="white" />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.instruction, { color: themeColors.text }]} numberOfLines={2}>
            {currentStep.instruction}
          </Text>
          <Text style={[styles.destination, { color: themeColors.secondary }]}>
            to {destination} • Step {stepNumber + 1} of {totalSteps} • Live Updates
          </Text>
          {currentStep.distance && (
            <Text style={[styles.distance, { color: themeColors.secondary }]}>
              {Math.round(currentStep.distance * 100)}m
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.background }]}
          onPress={onShowAllDirections}
        >
          <MaterialIcons name="list" size={18} color={themeColors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.background }]}
          onPress={onStopNavigation}
        >
          <MaterialIcons name="close" size={18} color={themeColors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1002,
  },
  instructionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  instruction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  destination: {
    fontSize: 12,
    marginBottom: 2,
  },
  distance: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default NavigationInstructionsBar;
