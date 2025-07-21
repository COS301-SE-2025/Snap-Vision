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
                {
                  id: '1',
                  name: 'Building A',
                  timestamp: { toDate: () => new Date('2023-07-01') },
                },
                {
                  id: '2',
                  name: 'Building B',
                  timestamp: { toDate: () => new Date('2023-07-02') },
                },
              ],
            }),
          }),
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

describe('RecentlyVisitedCarousel', () => {
  it('renders "No recently visited locations" when no visits are provided', () => {
    render(<RecentlyVisitedCarousel visits={[]} />);
    expect(screen.getByText('No recently visited locations.')).toBeTruthy();
  });

  it('renders a list of recently visited locations', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
      { id: '2', name: 'Building B', timestamp: { toDate: () => new Date('2023-07-02') } },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Building A')).toBeTruthy();
    expect(screen.getByText('Building B')).toBeTruthy();
    expect(screen.getByText('7/1/2023')).toBeTruthy();
    expect(screen.getByText('7/2/2023')).toBeTruthy();
  });

  it('handles item selection', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
    ];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    const item = getByText('Building A');

    fireEvent.press(item);
    expect(console.log).toHaveBeenCalledWith('Selected:', 'Building A');
  });

  it('renders no items when visits array is empty', () => {
    render(<RecentlyVisitedCarousel visits={[]} />);
    expect(screen.queryByText('Building A')).toBeNull(); // Ensure no items are rendered
  });

  it('renders all items in the visits array', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
      { id: '2', name: 'Building B', timestamp: { toDate: () => new Date('2023-07-02') } },
      { id: '3', name: 'Building C', timestamp: { toDate: () => new Date('2023-07-03') } },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Building A')).toBeTruthy();
    expect(screen.getByText('Building B')).toBeTruthy();
    expect(screen.getByText('Building C')).toBeTruthy();
  });

  it('uses a unique key for each item', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
      { poiId: 'poi123', name: 'Building B', timestamp: { toDate: () => new Date('2023-07-02') } },
    ];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    expect(getByText('Building A')).toBeTruthy();
    expect(getByText('Building B')).toBeTruthy();
  });

  it('logs the correct item when pressed', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
      { id: '2', name: 'Building B', timestamp: { toDate: () => new Date('2023-07-02') } },
    ];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    const item = getByText('Building B');

    fireEvent.press(item);
    expect(console.log).toHaveBeenCalledWith('Selected:', 'Building B');
  });

  it('formats the timestamp correctly', () => {
    const visits = [
      { id: '1', name: 'Building A', timestamp: { toDate: () => new Date('2023-07-01') } },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('7/1/2023')).toBeTruthy();
  });

  it('handles items without a timestamp', () => {
    const visits = [{ id: '1', name: 'Building A' }];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('Building A')).toBeTruthy();
    expect(screen.queryByText('7/1/2023')).toBeNull();
  });

  it('handles items with long names', () => {
    const visits = [
      {
        id: '1',
        name: 'A very long building name that might overflow',
        timestamp: { toDate: () => new Date('2023-07-01') },
      },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('A very long building name that might overflow')).toBeTruthy();
  });
});
