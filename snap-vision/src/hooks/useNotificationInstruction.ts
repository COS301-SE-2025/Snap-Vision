import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

export function useNotificationInstruction(isNavigating: boolean, currentInstruction: string) {
  const lastNotifiedInstruction = useRef<string | null>(null);
  useEffect(() => {
    let appStateListener: any;

    notifee.createChannel({
      id: 'navigation-channel-v2',
      name: 'Navigation Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    if (isNavigating && currentInstruction) {
      appStateListener = AppState.addEventListener('change', (nextState) => {
         if (nextState === 'background' && currentInstruction !== lastNotifiedInstruction.current) {
          notifee.displayNotification({
            title: 'Navigation Update',
            body: currentInstruction,
            android: {
              channelId: 'navigation-channel-v2',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              pressAction: { id: 'default', launchActivity: 'default' },
            },
          });
           lastNotifiedInstruction.current = currentInstruction;
        }
      });
    }

    return () => {
      if (appStateListener) appStateListener.remove();
    };
  }, [isNavigating, currentInstruction]);
}
