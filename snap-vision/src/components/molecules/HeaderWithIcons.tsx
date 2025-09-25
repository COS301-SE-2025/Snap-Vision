// src/components/molecules/HeaderWithIcons.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IconButton from '../atoms/IconButton';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useLanding } from '../../context/LandingContext';

export default function HeaderWithIcons() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<any>();
  const { setHasSeenLanding } = useLanding();

  return (
    <View style={styles.header}>
      <Text
        style={[
          styles.title,
          {
            fontFamily: 'ChicleRegular',
            color: colors.primary,
            // transform: [{ rotate: '-3deg' }],
            textShadowColor: colors.secondary,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          },
        ]}
      >
        GOING SOMEWHERE?
      </Text>

      {/* <FAIcon
        name="bell"                     
        size={30}
        color={colors.secondary}
        style={styles.notification}
        onPress={() =>
          navigation.navigate('Settings', {
            screen: 'NotificationSettings',
          })
        }
      />

      <FAIcon
        name="user-circle"
        size={30}
        color={colors.secondary}
        style={styles.profile}
        onPress={() =>
          navigation.navigate('Settings', {
            screen: 'AccountSettings',
          })
        }
      /> */}

      <FAIcon
        name="info-circle"
        size={24}
        color={colors.secondary}
        style={styles.info}
        onPress={() => setHasSeenLanding(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 6,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 20,
  },
  title: {
    fontSize: 52,
    textAlign: 'center',
    maxWidth: '90%',
  },
  notification: {
    position: 'absolute',
    top: -50,
    right: 65,
  },
  profile: {
    position: 'absolute',
    top: -50,
    right: 25,
  },
  info: {
    position: 'absolute',
    top: -40,
    left: 25,
  },
});
