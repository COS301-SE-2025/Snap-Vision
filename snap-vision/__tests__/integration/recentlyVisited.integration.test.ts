import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { addRecentlyVisitedPOI, getRecentlyVPOIs, Visit } from '../../src/services/firebase/recentlyVService';
import RecentlyVisitedCarousel from '../../src/components/molecules/RecentlyVisitedCarousel';
import firestore from '@react-native-firebase/firestore';

const mockUserId = 'test-user';

beforeAll(async () => {
  firestore().useEmulator('127.0.0.1', 8080);

  // Set up Firestore emulator data
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
  // Clean up Firestore emulator data
  const userDocRef = firestore().collection('recentlyVisited').doc(mockUserId);
  await userDocRef.delete();
});

describe('Recently Visited Integration Tests', () => {
  it('should fetch and display recently visited POIs', async () => {
    // Fetch recently visited POIs
    const visits = await getRecentlyVPOIs(mockUserId);

    // Render the RecentlyVisitedCarousel component
    render(React.createElement(RecentlyVisitedCarousel, { visits }));

    // Assert that the POI is displayed
    const poiName = await screen.findByText('Test Location 1');
    expect(poiName).toBeTruthy();
  });

  //   it('should add a new recently visited POI', async () => {
  //   // First, get the initial count
  //   const initialVisits = await getRecentlyVPOIs(mockUserId);
  //   const initialCount = initialVisits.length;
  
  //   // Add a new POI
  //   const newVisit: Visit = {
  //     userId: mockUserId,
  //     poiId: 'poi-2',
  //     name: 'Test Location 2',
  //     timestamp: firestore.Timestamp.now(),
  //     centroid: { latitude: -25.756, longitude: 28.234 },
  //   };
    
  //   await addRecentlyVisitedPOI(newVisit);
  
  //   // Fetch updated POIs and verify the data exists
  //   const updatedVisits = await getRecentlyVPOIs(mockUserId);
    
  //   // Debug: Log the visits to see what we actually got
  //   console.log('Updated visits:', updatedVisits.map(v => v.name));
    
  //   // Verify we have more POIs now
  //   expect(updatedVisits.length).toBe(initialCount + 1);
    
  //   // Verify the new POI exists in the data
  //   const newPOI = updatedVisits.find(visit => visit.name === 'Test Location 2');
  //   expect(newPOI).toBeDefined();
  //   expect(newPOI?.poiId).toBe('poi-2');
  
  //   // Now render with the updated data
  //   render(React.createElement(RecentlyVisitedCarousel, { visits: updatedVisits }));
  
  //   // Assert that the new POI is displayed
  //   const newPoiName = await screen.findByText('Test Location 2');
  //   expect(newPoiName).toBeTruthy();
    
  //   // Also verify the original POI is still there
  //   const originalPoiName = await screen.findByText('Test Location 1');
  //   expect(originalPoiName).toBeTruthy();
  // });

  it('should use the Firestore emulator', async () => {
  const userDocRef = firestore().collection('recentlyVisited').doc('test-user');
  await userDocRef.set({ test: 'data' });

  // Assert that the Firestore emulator was used
  expect(firestore().useEmulator).toHaveBeenCalledWith('127.0.0.1', 8080);
});
});