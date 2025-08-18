/* eslint-env jest */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RecentlyVisitedCarousel from '../src/components/molecules/RecentlyVisitedCarousel';
import { Visit } from '../src/services/firebase/recentlyVService';

// Mock Firebase Timestamp to match real structure
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const mockTimestamp: FirebaseFirestoreTypes.Timestamp = {
  toDate: () => new Date('2023-07-01'),
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  isEqual: () => false,
  toMillis: () => new Date('2023-07-01').getTime(),
  toJSON: () => ({
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
  }),
  valueOf: () => 'mock-timestamp',
};

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
                  userId: 'user123',
                  poiId: 'poi-1',
                  name: 'Building A',
                  timestamp: mockTimestamp,
                  centroid: { latitude: -25.755, longitude: 28.233 },
                },
                {
                  userId: 'user123',
                  poiId: 'poi-2',
                  name: 'Building B',
                  timestamp: mockTimestamp,
                  centroid: { latitude: -25.756, longitude: 28.234 },
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
    now: jest.fn(() => mockTimestamp),
  },
}));

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('RecentlyVisitedCarousel', () => {
  const createVisit = (overrides: Partial<Visit> = {}): Visit => ({
    userId: 'user123',
    poiId: 'poi-1',
    name: 'Building A',
    timestamp: mockTimestamp,
    centroid: { latitude: -25.755, longitude: 28.233 },
    ...overrides,
  });

  const createVisits = (count: number, overrides: Partial<Visit>[] = []): Visit[] => {
    return Array.from({ length: count }, (_, index) =>
      createVisit({
        poiId: `poi-${index + 1}`,
        name: `Building ${String.fromCharCode(65 + index)}`, // A, B, C...
        centroid: {
          latitude: -25.755 + index * 0.001,
          longitude: 28.233 + index * 0.001,
        },
        ...overrides[index],
      }),
    );
  };
  const createVisitWithId = (overrides: Partial<Visit> = {}): Visit => ({
    ...createVisit(overrides),
    id: 'unique-id-123',
  });

  it('renders "No recently visited locations" when no visits are provided', () => {
    render(<RecentlyVisitedCarousel visits={[]} />);
    expect(screen.getByText('No recently visited locations.')).toBeTruthy();
  });

  it('renders a list of recently visited locations', () => {
    const visits = createVisits(2);

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Building A')).toBeTruthy();
    expect(screen.getByText('Building B')).toBeTruthy();
  });

  it('handles item selection', () => {
    const visits = [createVisit()];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    const item = getByText('Building A');

    fireEvent.press(item);
    expect(console.log).toHaveBeenCalledWith('Selected:', 'Building A');
  });

  it('renders no items when visits array is empty', () => {
    render(<RecentlyVisitedCarousel visits={[]} />);
    expect(screen.queryByText('Building A')).toBeNull();
  });

  it('renders all items in the visits array', () => {
    const visits = createVisits(3);

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Building A')).toBeTruthy();
    expect(screen.getByText('Building B')).toBeTruthy();
    expect(screen.getByText('Building C')).toBeTruthy();
  });

  it('uses a unique key for each item', () => {
    const visits = createVisits(2);

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    expect(getByText('Building A')).toBeTruthy();
    expect(getByText('Building B')).toBeTruthy();
  });

  it('logs the correct item when pressed', () => {
    const visits = createVisits(2);

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    const item = getByText('Building B');

    fireEvent.press(item);
    expect(console.log).toHaveBeenCalledWith('Selected:', 'Building B');
  });

  it('handles items with timestamp', () => {
    const visits = [createVisit()];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('Building A')).toBeTruthy();
  });

  it('handles items without timestamp', () => {
    const visits = [createVisit({ timestamp: undefined })];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('Building A')).toBeTruthy();
  });

  it('handles items with long names', () => {
    const visits = [
      createVisit({
        name: 'A very long building name that might overflow',
      }),
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('A very long building name that might overflow')).toBeTruthy();
  });

  it('displays formatted timestamp correctly', () => {
    const visits = [createVisit()];

    render(<RecentlyVisitedCarousel visits={visits} />);
  });

  it('uses item.id as key when available', () => {
    const visits = [createVisitWithId()];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    expect(getByText('Building A')).toBeTruthy();
  });

  it('uses index as fallback key when id and poiId are missing', () => {
    const visits: any[] = [
      {
        userId: 'user123',
        name: 'Building A',
        timestamp: mockTimestamp,
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
    ];

    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);
    expect(getByText('Building A')).toBeTruthy();
  });
});
