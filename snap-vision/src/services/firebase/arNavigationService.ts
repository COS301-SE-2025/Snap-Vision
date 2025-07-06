import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface ARNavigationSession {
  userId: string;
  destination: string;
  startTime: Date;
  endTime?: Date;
  routeCompleted: boolean;
  arUsed: boolean;
}

export async function startARNavigationSession(destination: string): Promise<string> {
  const userId = auth().currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const session: ARNavigationSession = {
    userId,
    destination,
    startTime: new Date(),
    routeCompleted: false,
    arUsed: true,
  };

  const docRef = await firestore().collection('arNavigationSessions').add(session);
  return docRef.id;
}

export async function completeARNavigationSession(sessionId: string) {
  await firestore()
    .collection('arNavigationSessions')
    .doc(sessionId)
    .update({
      endTime: new Date(),
      routeCompleted: true,
    });
}