import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface NavigationPanelProps {
  isNavigating: boolean;
  isLoading: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  progress: number;
  distance: number | null;
  time: number | null;
  destination: string;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  isLoading,
  onStartNavigation,
  onStopNavigation,
  progress,
  distance,
  time,
  destination
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
  
  // Format the time (e.g., "5 min" or "< 1 min")
  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '';
    
    if (minutes < 1) {
      return '< 1 min';
    } else {
      return `${Math.round(minutes)} min`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Destination Info */}
      <View style={styles.infoSection}>
        <Text style={[styles.destinationText, { color: colors.text }]} numberOfLines={1}>
          {destination}
        </Text>
        
        {distance !== null && (
          <View style={styles.detailsRow}>
            <Icon name="map-marker-distance" size={16} color={colors.primary} style={styles.icon} />
            <Text style={[styles.detailsText, { color: colors.text }]}>
              {formatDistance(distance)}
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
        
        {/* Progress Bar */}
        {(isNavigating || progress > 0) && (
          <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${progress}%`, backgroundColor: colors.primary }
              ]} 
            />
            <Text style={[styles.progressText, progress > 50 ? { color: '#fff' } : { color: colors.text }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
      
      {/* Navigation Button */}
      <TouchableOpacity
        style={[
          styles.navButton,
          { backgroundColor: isNavigating ? '#E53935' : colors.primary }
        ]}
        onPress={isNavigating ? onStopNavigation : onStartNavigation}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Icon 
              name={isNavigating ? "stop-circle" : "navigation"} 
              size={18} 
              color="#fff" 
              style={styles.buttonIcon} 
            />
            <Text style={styles.navButtonText}>
              {isNavigating ? 'Stop' : 'Start'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70, // Positioned above the MapActionsPanel
    left: 10,
    right: 10,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  infoSection: {
    flex: 1,
    marginRight: 12,
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
    paddingTop: 3, // Better centering on Android
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 90,
  },
  buttonIcon: {
    marginRight: 6,
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default NavigationPanel;