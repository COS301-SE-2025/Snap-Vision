import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import {
  addRecentlyVisitedPOI,
  getRecentlyVPOIs,
  Visit,
} from '../../src/services/firebase/recentlyVService';
import RecentlyVisitedCarousel from '../../src/components/molecules/RecentlyVisitedCarousel';
import firestore from '@react-native-firebase/firestore';

const mockUserId = 'test-user';

beforeAll(async () => {
  firestore().useEmulator('127.0.0.1', 8080);

  //set up Firestore emulator data
  const userDocRef = firestore().collection('recentlyVisited').doc(mockUserId);
  await userDocRef.set({
    pois: [
      {
        poiId: 'poi-1',
        name: 'Test Location 1',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
    ],
  });
});

afterAll(async () => {
  //clean up Firestore emulator data
  const userDocRef = firestore().collection('recentlyVisited').doc(mockUserId);
  await userDocRef.delete();
});

describe('Recently Visited Integration Tests', () => {
  it('should fetch and display recently visited POIs', async () => {
    const visits = await getRecentlyVPOIs(mockUserId);

    render(<RecentlyVisitedCarousel visits={visits} />);

    const poiName = await screen.findByText('Test Location 1');
    expect(poiName).toBeTruthy();
  });

  it('should use the Firestore emulator', async () => {
    const userDocRef = firestore().collection('recentlyVisited').doc('test-user');
    await userDocRef.set({ test: 'data' });

    expect(firestore().useEmulator).toHaveBeenCalledWith('127.0.0.1', 8080);
  });

  it('should handle item press with real Firebase data', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const visits = await getRecentlyVPOIs(mockUserId);
    const { getByText } = render(<RecentlyVisitedCarousel visits={visits} />);

    const locationItem = getByText('Test Location 1');
    fireEvent.press(locationItem);

    expect(consoleSpy).toHaveBeenCalledWith('Selected:', 'Test Location 1');

    consoleSpy.mockRestore();
  });

  it('should handle auth fallback when no userId provided', async () => {
    const visits = await getRecentlyVPOIs();

    expect(visits).toEqual([]);

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('No recently visited locations.')).toBeTruthy();
  });

  it('should handle POIs without id or poiId using index as key', () => {
    const visits: any[] = [
      {
        userId: 'test-user',
        name: 'Location Without Keys',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
      {
        userId: 'test-user',
        name: 'Another Location Without Keys',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.756, longitude: 28.234 },
      },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Location Without Keys')).toBeTruthy();
    expect(screen.getByText('Another Location Without Keys')).toBeTruthy();
  });

  it('should handle all keyExtractor scenarios correctly', () => {
    const visits: any[] = [
      {
        userId: 'test-user',
        id: 'has-id',
        poiId: 'poi-1',
        name: 'With ID',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
      {
        userId: 'test-user',
        poiId: 'poi-2',
        name: 'Only POI ID',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.756, longitude: 28.234 },
      },
      {
        userId: 'test-user',
        name: 'Index Fallback',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.757, longitude: 28.235 },
      },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);
    expect(screen.getByText('With ID')).toBeTruthy();
    expect(screen.getByText('Only POI ID')).toBeTruthy();
    expect(screen.getByText('Index Fallback')).toBeTruthy();
  });

  it('should handle POIs without timestamps', () => {
    const visits: any[] = [
      {
        userId: 'test-user',
        poiId: 'poi-no-timestamp',
        name: 'Location Without Timestamp',
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('Location Without Timestamp')).toBeTruthy();
    expect(screen.queryByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeNull();
  });

  it('should handle mixed POI scenarios with and without timestamps', () => {
    const visits: any[] = [
      {
        userId: 'test-user',
        poiId: 'poi-1',
        name: 'With Timestamp',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
      {
        userId: 'test-user',
        poiId: 'poi-2',
        name: 'Without Timestamp',
        centroid: { latitude: -25.756, longitude: 28.234 },
      },
    ];

    render(<RecentlyVisitedCarousel visits={visits} />);

    expect(screen.getByText('With Timestamp')).toBeTruthy();
    expect(screen.getByText('Without Timestamp')).toBeTruthy();

    const timestamps = screen.queryAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should handle press events on items with different key types', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const visits: any[] = [
      {
        userId: 'test-user',
        id: 'item-with-id',
        poiId: 'poi-1',
        name: 'Item With ID',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.755, longitude: 28.233 },
      },
      {
        userId: 'test-user',
        poiId: 'poi-2',
        name: 'Item With POI ID Only',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.756, longitude: 28.234 },
      },
      {
        userId: 'test-user',
        name: 'Item With Index Key',
        timestamp: firestore.Timestamp.now(),
        centroid: { latitude: -25.757, longitude: 28.235 },
      },
    ];
    render(<RecentlyVisitedCarousel visits={visits} />);

    fireEvent.press(screen.getByText('Item With ID'));
    fireEvent.press(screen.getByText('Item With POI ID Only'));
    fireEvent.press(screen.getByText('Item With Index Key'));

    expect(consoleSpy).toHaveBeenCalledWith('Selected:', 'Item With ID');
    expect(consoleSpy).toHaveBeenCalledWith('Selected:', 'Item With POI ID Only');
    expect(consoleSpy).toHaveBeenCalledWith('Selected:', 'Item With Index Key');
    expect(consoleSpy).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });
});
