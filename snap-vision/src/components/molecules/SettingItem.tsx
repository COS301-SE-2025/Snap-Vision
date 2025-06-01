import React from 'react';
import { View, StyleSheet } from 'react-native';
import ThemedText from '../atoms/ThemedText';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export interface Props {
  title: string;
  description?: string;
  rightComponent: React.ReactNode;
  titleStyle?: any;
  descriptionStyle?: any;
}

const SettingItem = ({ 
  title, 
  description, 
  rightComponent,
  titleStyle,
  descriptionStyle
}: Props) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.textContainer}>
        <ThemedText 
          size="md" 
          weight="600"
          style={[{ color: colors.text }, titleStyle]}
        >
          {title}
        </ThemedText>
        {description && (
          <ThemedText 
            size="sm" 
            style={[{ color: colors.secondary, marginTop: 4 }, descriptionStyle]}
          >
            {description}
          </ThemedText>
        )}
      </View>
      <View style={styles.rightComponent}>
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  rightComponent: {
    alignItems: 'flex-end',
  },
});

export default SettingItem;