// src/components/organisms/IndoorNavigationInstructionsContent.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { NavigationGraph, calculateRoute, generateDetailedDirections, NavigationStep } from '../../utils/navigationUtils';
import firestore from '@react-native-firebase/firestore';
import SettingsHeader from '../molecules/SettingsHeader';

interface Props {
  buildingId: string;
  floorId: string;
  startRoomId: string;
  endRoomId: string;
  onNavigationComplete: () => void;
  onBack: () => void;
}

export default function IndoorNavigationInstructionsContent({
  buildingId,
  floorId,
  startRoomId,
  endRoomId,
  onNavigationComplete,
  onBack
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startRoomName, setStartRoomName] = useState('');
  const [endRoomName, setEndRoomName] = useState('');

  useEffect(() => {
    generateNavigationSteps();
  }, [startRoomId, endRoomId]);

  const generateNavigationSteps = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Generating navigation steps for:', {
        buildingId,
        floorId,
        startRoomId,
        endRoomId
      });

      // Load room data
      const roomsSnapshot = await firestore()
        .collection('RoomPOIs')
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorId)
        .get();

      const rooms = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load path data
      const pathsSnapshot = await firestore()
        .collection('PathPOIs')
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorId)
        .get();

      const paths = pathsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (rooms.length === 0) {
        setError('No rooms found for this floor');
        return;
      }

      if (paths.length === 0) {
        setError('No navigation paths available for this floor');
        return;
      }

      // Find start and end rooms
      const startRoom = rooms.find(r => r.id === startRoomId);
      const endRoom = rooms.find(r => r.id === endRoomId);

      if (!startRoom || !endRoom) {
        setError('Selected rooms not found');
        return;
      }

      setStartRoomName(startRoom.name);
      setEndRoomName(endRoom.name);

      // Calculate route
      const routeSteps = calculateRoute(startRoomId, endRoomId, rooms, paths);
      
      if (routeSteps.length === 0) {
        setError('No route found between selected rooms');
        return;
      }

      // Generate detailed directions
      const detailedSteps = generateDetailedDirections(routeSteps);
      setSteps(detailedSteps);
      
    } catch (error) {
      console.error('Error generating navigation steps:', error);
      setError('Failed to generate navigation route');
    } finally {
      setIsLoading(false);
    }
  };

  const markStepCompleted = (stepIndex: number) => {
    if (stepIndex === steps.length - 1) {
      // Reached destination
      Alert.alert(
        'Destination Reached!',
        `You have arrived at ${endRoomName}`,
        [
          { text: 'Finish', onPress: onNavigationComplete }
        ]
      );
    } else {
      setCurrentStep(stepIndex + 1);
    }
  };

  const getStepIcon = (step: NavigationStep, index: number) => {
    if (index < currentStep) {
      return 'check-circle';
    }
    
    switch (step.type) {
      case 'start':
        return 'play-circle';
      case 'turn':
        return step.instruction.includes('left') ? 'arrow-left' : 'arrow-right';
      case 'destination':
        return 'flag-checkered';
      default:
        return 'arrow-up';
    }
  };

  const getStepColor = (index: number) => {
    if (index < currentStep) {
      return colors.success || '#4CAF50';
    } else if (index === currentStep) {
      return colors.primary;
    } else {
      return colors.secondary;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Generating Route..." />
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Calculating best route...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Navigation Error" />
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={64} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onBack}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Navigation" />
      
      <View style={styles.header}>
        <Text style={[styles.routeTitle, { color: colors.text }]}>
          {startRoomName} → {endRoomName}
        </Text>
        <Text style={[styles.progressText, { color: colors.secondary }]}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
        {steps.map((step, index) => (
          <View
            key={index}
            style={[
              styles.stepItem,
              {
                backgroundColor: index === currentStep ? colors.primary + '20' : colors.card,
                borderColor: index === currentStep ? colors.primary : colors.border,
                opacity: index > currentStep ? 0.7 : 1
              }
            ]}
          >
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: getStepColor(index) }]}>
                <Icon 
                  name={getStepIcon(step, index)} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepInstruction,
                  { 
                    color: colors.text,
                    textDecorationLine: index < currentStep ? 'line-through' : 'none'
                  }
                ]}>
                  {step.instruction}
                </Text>
                {step.distance && (
                  <Text style={[styles.stepDistance, { color: colors.secondary }]}>
                    Total distance: {Math.round(step.distance * 100)}m
                  </Text>
                )}
              </View>
            </View>
            
            {index === currentStep && index < steps.length - 1 && (
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: colors.primary }]}
                onPress={() => markStepCompleted(index)}
              >
                <Text style={styles.completeButtonText}>
                  I've completed this step
                </Text>
              </TouchableOpacity>
            )}

            {index === currentStep && index === steps.length - 1 && (
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: colors.success || '#4CAF50' }]}
                onPress={() => markStepCompleted(index)}
              >
                <Text style={styles.completeButtonText}>
                  I've arrived!
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onBack}
        >
          <Icon name="arrow-left" size={20} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>
            Back to Room Selection
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
  },
  stepsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepItem: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 14,
  },
  completeButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});