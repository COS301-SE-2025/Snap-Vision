import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppInput from '../components/atoms/AppInput';
import AppButton from '../components/atoms/AppButton';
import StandardPopup from '../components/atoms/StandardPopup';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import auth from '@react-native-firebase/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setErrorPopupMessage('Please enter your email address.');
      setShowErrorPopup(true);
      return;
    }

    try {
      await auth().sendPasswordResetEmail(email);
      setShowSuccessPopup(true);
    } catch (error: any) {
      setErrorPopupMessage(error?.message || 'Failed to send reset email.');
      setShowErrorPopup(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.header,
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
        RESET PASSWORD
      </Text>

      <Text style={[styles.label, { color: colors.secondary }]}>Email</Text>
      <AppInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.primary }]}
      />

      <AppButton title="Send Reset Email" onPress={handleResetPassword} />

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorPopupMessage}
        onConfirm={() => setShowErrorPopup(false)}
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message="Password reset email sent."
        onConfirm={() => setShowSuccessPopup(false)}
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 24,
  },
});
