import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface NavigationPanelProps {
  isNavigating: boolean;
  isLoading?: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  progress: number;
  distance: number | null;
  time: number | null;
  destination: string;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  isLoading = false,
  onStartNavigation,
  onStopNavigation,
  progress,
  distance,
  time,
  destination,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const formattedDistance = distance !== null 
    ? distance > 1000 
      ? `${(distance / 1000).toFixed(1)} km` 
      : `${Math.round(distance)} m`
    : '--';
    
  const formattedTime = time !== null 
    ? time > 60 
      ? `${Math.floor(time / 60)}h ${time % 60}m` 
      : `${time} min`
    : '--';

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? colors.secondary : '#fff',
          borderColor: colors.primary,
        }
      ]}
    >
      {isNavigating ? (
        <>
          <View style={styles.header}>
            <Text style={[styles.destinationText, { color: colors.primary }]}>
              {destination}
            </Text>
            <TouchableOpacity 
              style={[styles.stopButton, { backgroundColor: '#e74c3c' }]} 
              onPress={onStopNavigation}
            >
              <Icon name="stop" size={16} color="#fff" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Icon name="map-marker-distance" size={24} color={colors.primary} />
              <Text style={[styles.infoText, { color: isDark ? '#fff' : '#333' }]}>
                {formattedDistance}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="clock-outline" size={24} color={colors.primary} />
              <Text style={[styles.infoText, { color: isDark ? '#fff' : '#333' }]}>
                {formattedTime}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, { color: isDark ? '#ccc' : '#666' }]}>
              {Math.round(progress)}% complete
            </Text>
            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#444' : '#eee' }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: progress > 90 ? '#27ae60' : colors.primary
                  }
                ]} 
              />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.startContainer}>
          <Text style={[styles.destinationText, { color: colors.primary }]}>
            {destination}
          </Text>
          <TouchableOpacity 
            style={[
              styles.startButton, 
              { 
                backgroundColor: isLoading ? colors.secondary : colors.primary,
                opacity: isLoading ? 0.7 : 1 
              }
            ]} 
            onPress={onStartNavigation}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.startButtonText}>Calculating route...</Text>
              </>
            ) : (
              <>
                <Icon name="navigation" size={20} color="#fff" />
                <Text style={styles.startButtonText}>Start Navigation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  stopButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  startContainer: {
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginTop: 12,
  },
  startButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default NavigationPanel;