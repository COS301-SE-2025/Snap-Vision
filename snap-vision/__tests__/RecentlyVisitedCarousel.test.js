import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RecentlyVisitedCarousel from '../src/components/molecules/RecentlyVisitedCarousel';
import { addRecentlyVisitedPOI } from '../src/services/firebase/recentlyVService';
import firestore from '@react-native-firebase/firestore';

jest.mock('@react-native-firebase/app', () => ({
  firebase: {
    app: jest.fn(() => ({
      name: '[DEFAULT]',
      options: {},
    })),
    apps: [],
  },
}));

jest.mock('@react-native-firebase/auth', () => ({
  auth: jest.fn(() => ({
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    currentUser: { uid: 'user123' },
    currentUser: null,
  })),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true, 
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              pois: [
                { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
                { id: '2', name: 'Building B', timestamp: { toDate: () => new Date('2023-07-02') } },
              ],
            }),
          })
        ),
        set: jest.fn(),
        update: jest.fn(),
      })),
    })),
  })),
  Timestamp: {
    now: jest.fn(() => new Date()), 
  },
}));


beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});


