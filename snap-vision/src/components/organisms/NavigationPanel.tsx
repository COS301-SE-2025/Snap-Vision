import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TextToSpeech from '../molecules/TextToSpeech';

interface NavigationPanelProps {
  isNavigating: boolean;
  isLoading: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onCancelRoute: () => void;
  progress: number;
  distance: number | null;
  distanceWalked: number; // New: Distance walked from start (never decreases)
  originalRouteDistance: number | null; // New: Original route distance for completion tracking
  time: number | null;
  destination: string;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  currentInstruction?: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  // AR Navigation props
  showAR?: boolean;
  onToggleAR?: () => void;
  destinationCoords?: [number, number] | null;
  // Minimization props
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  isLoading,
  onStartNavigation,
  onStopNavigation,
  onCancelRoute,
  progress,
  distance,
  distanceWalked,
  originalRouteDistance,
  time,
  destination,
  isVoiceEnabled,
  onToggleVoice,
  currentInstruction,
  onSpeakingChange,
  showAR = false,
  onToggleAR,
  destinationCoords,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Format the distance (e.g., "2.1 km" or "350 m")
  const formatDistance = (meters: number | null) => {
    if (meters === null) return '';

    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    } else {
      return `${Math.round(meters)} m`;
    }
  };

  // Calculate completion percentage based on distance remaining
  const getCompletionPercentage = () => {
    if (!originalRouteDistance || originalRouteDistance === 0 || distance === null) {
      return progress; // Fallback to route progress if no distance data
    }

    // Calculate progress based on how much distance is left vs original distance
    const remainingPercent = (distance / originalRouteDistance) * 100;
    const completionPercent = Math.max(0, Math.min(100, 100 - remainingPercent));

    // Use the higher of route progress or distance-based progress to prevent decreases
    return Math.max(progress, Math.round(completionPercent));
  };

  // Format distance remaining for display
  const formatDistanceRemaining = (meters: number | null) => {
    if (meters === null) return '';

    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km left`;
    } else {
      return `${Math.round(meters)}m left`;
    }
  };

  // Format the time (e.g., "5 min" or "< 1 min")
  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '';

    if (minutes < 1) {
      return '< 1 min';
    } else {
      return `${Math.round(minutes)} min`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading</Text>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading</Text>
      </View>
    );
  }

  // Minimized version (works for both AR and 2D modes)
  if (isMinimized) {
    const completionPercent = getCompletionPercentage();

    return (
      <View style={[styles.minimizedContainer, { backgroundColor: colors.card }]}>
        <Pressable style={styles.minimizedContent} onPress={onToggleMinimize}>
          <Text style={[styles.minimizedText, { color: colors.text }]} numberOfLines={1}>
            {destination} • {formatDistanceRemaining(distance)} • {formatTime(time)} •{' '}
            {completionPercent}%
          </Text>
          <Icon name="chevron-up" size={16} color={colors.text} />
        </Pressable>

        {/* Essential controls */}
        <View style={styles.minimizedControls}>
          <Pressable
            style={[styles.miniButton, { backgroundColor: colors.danger }]}
            onPress={onCancelRoute}
          >
            <Icon name="close" size={12} color="#fff" />
          </Pressable>

          <Pressable
            style={[styles.miniButton, { backgroundColor: '#E53935' }]}
            onPress={onStopNavigation}
          >
            <Icon name="stop" size={12} color="#fff" />
          </Pressable>

          {onToggleAR && (
            <Pressable
              style={[
                styles.miniButton,
                { backgroundColor: showAR ? colors.primary : colors.secondary },
              ]}
              onPress={onToggleAR}
            >
              <Icon name="camera-outline" size={12} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header with Minimize and Cancel Buttons */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        {onToggleMinimize && (
          <Pressable
            style={[styles.minimizeButton, { backgroundColor: colors.secondary }]}
            onPress={onToggleMinimize}
          >
            <Icon name="chevron-down" size={14} color="#fff" />
          </Pressable>
        )}
        <Pressable
          style={[styles.cancelButton, { backgroundColor: colors.danger }]}
          onPress={onCancelRoute}
        >
          <Icon name="close" size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Destination Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.destinationText, { color: colors.text }]} numberOfLines={1}>
            {destination}
          </Text>

          {distance !== null && (
            <View style={styles.detailsRow}>
              <Icon
                name="map-marker-distance"
                size={16}
                color={colors.primary}
                style={styles.icon}
              />
              <Text style={[styles.detailsText, { color: colors.text }]}>
                {formatDistanceRemaining(distance)}
              </Text>

              {time !== null && (
                <>
                  <Text style={[styles.separator, { color: colors.text }]}>•</Text>
                  <Icon name="clock-outline" size={16} color={colors.primary} style={styles.icon} />
                  <Text style={[styles.detailsText, { color: colors.text }]}>
                    {formatTime(time)}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Progress Bar - Commented out temporarily */}
          {/* {(isNavigating || progress > 0 || distanceWalked > 0) && (
            <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${getCompletionPercentage()}%`, backgroundColor: colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.progressText,
                  getCompletionPercentage() > 50 ? { color: '#fff' } : { color: colors.text },
                ]}
              >
                {getCompletionPercentage()}%
              </Text>
            </View>
          )} */}

          {/* Current Instruction */}
          {currentInstruction && (
            <View style={styles.instructionContainer}>
              <Text style={[styles.instructionText, { color: colors.text }]}>
                {currentInstruction}
              </Text>
            </View>
          )}

          {/* Progress Display */}
          {(isNavigating || progress > 0 || distanceWalked > 0) && (
            <View style={styles.progressSection}>
              <Text style={[styles.progressText, { color: colors.text }]}>
                {getCompletionPercentage()}%
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* AR Button */}
            {destinationCoords && onToggleAR && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                onPress={onToggleAR}
                testID="icon-camera-outline"
              >
                <Icon name="camera-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>AR</Text>
              </Pressable>
            )}

            {/* Voice Button */}
            {isNavigating && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                onPress={onToggleVoice}
                testID="icon-volume-high"
              >
                <Icon name={isVoiceEnabled ? 'volume-high' : 'volume-off'} size={20} color="#fff" />
              </Pressable>
            )}

            {/* Start/Stop Button */}
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: isNavigating ? '#E53935' : colors.primary },
              ]}
              onPress={isNavigating ? onStopNavigation : onStartNavigation}
            >
              <Text style={styles.actionButtonText}>
                {isNavigating ? 'Stop' : 'Start'}
              </Text>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={onCancelRoute}
            >
              <Text style={styles.actionButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Minimize Button */}
          {onToggleMinimize && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={onToggleMinimize}
              testID="icon-chevron-down"
            >
              <Icon name="chevron-down" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: '10%',
    right: '10%',
    maxWidth: 360,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    alignSelf: 'center',
  },
  minimizedContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxWidth: 360,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimizedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  minimizedText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  minimizedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 24, // Fixed height for the header
  },
  headerSpacer: {
    flex: 1, // Takes up space so cancel button is right-aligned
  },
  minimizeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoSection: {
    flex: 1,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 4,
  },
  detailsText: {
    fontSize: 14,
  },
  separator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  progressContainer: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
    paddingTop: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voiceStyleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    height: 36,
    width: 100,
    backgroundColor: '#222',
  },
  voiceIcon: {
    fontSize: 16,
    marginRight: 4,
    color: '#fff',
  },
  voiceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonIcon: {
    marginRight: 4,
  },
  voiceSection: {
    marginTop: 4,
  },

  // New Single Row Priority Styles
  singleRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  primaryARButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minHeight: 48,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minHeight: 48,
  },
  secondaryButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    width: 40,
    height: 40,
  },
  primaryButtonIcon: {
    marginRight: 8,
    fontSize: 20,
    color: '#fff',
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  // New styles for missing elements
  instructionContainer: {
    marginVertical: 8,
  },
  instructionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressSection: {
    marginVertical: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minHeight: 36,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
});

export default NavigationPanel;
