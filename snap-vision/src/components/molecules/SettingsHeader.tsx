import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  title: string;
}

export default function SettingsHeader({ title }: Props) {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.header, { backgroundColor: isDark ? '#824713' : '#B78459' }]}> 
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={[styles.title, { color: 'black' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
});