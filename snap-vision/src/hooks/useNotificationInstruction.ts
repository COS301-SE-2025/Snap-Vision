import { useEffect } from 'react';
import { AppState } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

export function useNotificationInstruction(isNavigating: boolean, currentInstruction: string) {
  useEffect(() => {
    let appStateListener: any;

    notifee.createChannel({
      id: 'navigation-channel',
      name: 'Navigation Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    if (isNavigating && currentInstruction) {
      appStateListener = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'background') {
          notifee.displayNotification({
            title: 'Navigation Update',
            body: currentInstruction,
            android: {
              channelId: 'navigation-channel',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              pressAction: { id: 'default', launchActivity: 'default' },
            },
          });
        }
      });
    }

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [isNavigating, currentInstruction]);
}
