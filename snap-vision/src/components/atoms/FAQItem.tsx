import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border || '#e1e1e1' }]}>
      <TouchableOpacity style={styles.questionContainer} onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.question, { color: colors.primary }]}>{question}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.primary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.answerContainer}>
          <Text style={[styles.answer, { color: colors.secondary }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    paddingRight: 16,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FAQItem;
