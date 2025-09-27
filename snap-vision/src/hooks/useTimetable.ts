import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { TimetableEntry } from '../types/timetable.types';

export const useTimetable = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = auth().currentUser?.uid;

  // Load timetable entries
  const loadEntries = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const snapshot = await firestore()
        .collection('timetables')
        .where('userId', '==', userId)
        .orderBy('day')
        .orderBy('startTime')
        .get();

      const timetableEntries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as TimetableEntry[];

      setEntries(timetableEntries);
      setError(null);
    } catch (err) {
      //console.error('Error loading timetable:', err);
      setError('Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new entry
  const addEntry = async (entryData: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (!userId) return;

    try {
      const docRef = await firestore()
        .collection('timetables')
        .add({
          ...entryData,
          userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      const newEntry: TimetableEntry = {
        id: docRef.id,
        ...entryData,
        userId,
        createdAt: new Date(),
      };

      setEntries((prev) =>
        [...prev, newEntry].sort((a, b) => {
          const dayOrder = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ];
          const dayA = dayOrder.indexOf(a.day);
          const dayB = dayOrder.indexOf(b.day);
          if (dayA !== dayB) return dayA - dayB;
          return a.startTime.localeCompare(b.startTime);
        }),
      );

      return { success: true };
    } catch (err) {
      //console.error('Error adding timetable entry:', err);
      setError('Failed to add class');
      return { success: false, error: 'Failed to add class' };
    }
  };

  // Update entry
  const updateEntry = async (
    entryId: string,
    entryData: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>,
  ) => {
    if (!userId) return;

    try {
      await firestore().collection('timetables').doc(entryId).update(entryData);

      setEntries((prev) =>
        prev
          .map((entry) => (entry.id === entryId ? { ...entry, ...entryData } : entry))
          .sort((a, b) => {
            const dayOrder = [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ];
            const dayA = dayOrder.indexOf(a.day);
            const dayB = dayOrder.indexOf(b.day);
            if (dayA !== dayB) return dayA - dayB;
            return a.startTime.localeCompare(b.startTime);
          }),
      );

      return { success: true };
    } catch (err) {
      //console.error('Error updating timetable entry:', err);
      setError('Failed to update class');
      return { success: false, error: 'Failed to update class' };
    }
  };

  // Delete entry
  const deleteEntry = async (entryId: string) => {
    if (!userId) return;

    try {
      await firestore().collection('timetables').doc(entryId).delete();

      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      return { success: true };
    } catch (err) {
      //console.error('Error deleting timetable entry:', err);
      setError('Failed to delete class');
      return { success: false, error: 'Failed to delete class' };
    }
  };

  useEffect(() => {
    loadEntries();
  }, [userId]);

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: loadEntries,
  };
};
