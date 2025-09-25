import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm?: (e: GestureResponderEvent) => void;
  onCancel?: (e: GestureResponderEvent) => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  verticalButtons?: boolean;
  onClose?: () => void;
}

export default function StandardPopup({
  visible,
  title = 'Notice',
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  verticalButtons = false,
  onClose,
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              shadowColor: isDark ? '#000' : '#888',
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>

          <View style={[verticalButtons ? styles.buttonColumn : styles.buttonRow]}>
            {showCancel && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  verticalButtons ? styles.buttonOutlineVertical : styles.buttonOutline,
                  { borderColor: colors.text },
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                verticalButtons ? styles.buttonFilledVertical : styles.buttonFilled,
                { backgroundColor: colors.primary },
              ]}
              onPress={(e) => {
                if (onConfirm) {
                  onConfirm(e);
                }
                if (onClose) {
                  onClose();
                }
              }}
            >
              <Text style={[styles.buttonTextFilled, { color: colors.background }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  buttonColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  buttonOutline: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonOutlineVertical: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonFilled: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  buttonFilledVertical: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextFilled: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
