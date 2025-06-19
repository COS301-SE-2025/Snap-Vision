import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SettingsHeader from '../molecules/SettingsHeader';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function SupportContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const supportOptions = [
    { 
      title: 'FAQ', 
      icon: 'frequently-asked-questions',
      description: 'View frequently asked questions' 
    },
    { 
      title: 'Contact Support', 
      icon: 'email-outline',
      description: 'Send us an email with your question' 
    },
    { 
      title: 'Report a Bug', 
      icon: 'bug-outline',
      description: 'Report technical issues or bugs' 
    },
    { 
      title: 'Feature Request', 
      icon: 'lightbulb-outline',
      description: 'Suggest new features or improvements' 
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Support" />
      
      <Text style={[styles.introText, { color: colors.text }]}>
        Need help? Choose from the options below:
      </Text>
      
      {supportOptions.map((option, index) => (
        <TouchableOpacity 
          key={index}
          style={[styles.optionContainer, { borderBottomColor: colors.border || '#e1e1e1' }]}
          onPress={() => {}}
        >
          <View style={styles.iconContainer}>
            <Icon name={option.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {option.title}
            </Text>
            <Text style={[styles.optionDescription, { color: colors.text + '99' }]}>
              {option.description}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text + '80'} />
        </TouchableOpacity>
      ))}
      
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.text + '80' }]}>
          SnapVision v1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 32,
  },
  introText: {
    fontSize: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
  },
  versionContainer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    fontSize: 14,
  }
});