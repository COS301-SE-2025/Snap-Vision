import { Alert } from 'react-native';

type AlertType = 'success' | 'error' | 'info';

export function showAlert(type: AlertType, title: string, message: string) {
  let finalTitle = title;
  let finalMessage = message;

  switch (type) {
    case 'success':
      finalTitle = title || 'Success';
      break;
    case 'error':
      finalTitle = title || 'Error';
      break;
    case 'info':
      finalTitle = title || 'Info';
      break;
  }

  Alert.alert(finalTitle, finalMessage);
}
