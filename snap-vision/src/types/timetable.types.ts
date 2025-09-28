import { Timestamp } from '@react-native-firebase/firestore';

export interface TimetableEntry {
  id: string;
  userId: string;
  course: string;
  day: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  venue: string;
  buildingId?: string;
  buildingName?: string;
  locationId?: string;
  createdAt: Timestamp;
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
