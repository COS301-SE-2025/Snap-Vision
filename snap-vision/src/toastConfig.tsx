import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from './theme/ThemeContext';
import { getThemeColors } from './theme';

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    toastBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1.5,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
    },
    iconContainer: {
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontWeight: '600',
      fontSize: 15,
    },
    subtitle: {
      fontSize: 13,
      marginTop: 4,
    },
  });

const StyledToast = ({ text1, text2, props: toastProps }: any) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const styles = getStyles(colors);

  const backgroundColor = toastProps?.backgroundColor ?? colors.card;
  const borderColor = toastProps?.borderColor ?? colors.primary;
  const textColor = toastProps?.textColor ?? colors.primary;
  const iconColor = toastProps?.iconColor ?? colors.secondary;

  return (
    <View style={styles.container}>
      <View style={[styles.toastBox, { backgroundColor, borderColor }]}> 
        <View style={styles.iconContainer}>
          <Icon name="information-circle-outline" size={24} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>{text1}</Text>
          {text2 ? <Text style={[styles.subtitle, { color: textColor }]}>{text2}</Text> : null}
        </View>
      </View>
    </View>
  );
};

export const toastConfig = {
  default: (props: any) => <StyledToast {...props} />,
};

// Export standardized props for programmatic Toast.show usage
export const getToastDefaultProps = (isDark: boolean) => {
  const colors = getThemeColors(isDark);

  return {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    textColor: colors.primary,
    iconColor: colors.secondary,
  };
};

// Helper to build a standardized payload for Toast.show
export const makeToastPayload = (
  text1: string,
  text2?: string,
  overrideProps: any = {},
  isDark: boolean = false,
) => {
  const defaultProps = getToastDefaultProps(isDark);
  return {
    type: 'default',
    text1,
    text2,
    props: { ...defaultProps, ...overrideProps },
  };
};
