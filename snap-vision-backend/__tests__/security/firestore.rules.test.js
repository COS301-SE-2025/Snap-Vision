const fs = require('fs');
const { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds,
  RulesTestEnvironment 
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');

describe('Snap Vision Firestore Security Rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'snap-vision-security-test',
      firestore: {
    host: '127.0.0.1',
    port: 8085,
    rules: `
       rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAdmin() {
        return request.auth != null && 
          get(/databases/$(database)/documents/userInformation/$(request.auth.uid)).data.role == "admin";
      }
      function isEditorFor(locationId) {
        return request.auth != null &&
          get(/databases/$(database)/documents/userInformation/$(request.auth.uid)).data.role == "editor" &&
          get(/databases/$(database)/documents/userInformation/$(request.auth.uid)).data.adminLocations.hasAny([locationId]);
      }
      function canEditLocation(locationId) {
        return isAdmin() || isEditorFor(locationId);
      }

      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /recentlyVisited/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /RoomPOIs/{roomId} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
      match /PathPOIs/{pathId} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
      match /UPcampusPOIs/{document=**} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
      match /locations/{locationId}/roomPOIs/{roomId} {
        allow read: if request.auth != null;
        allow write: if canEditLocation(locationId);
      }
      match /crowdReports/{reportId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null &&
          request.auth.uid == resource.data.reportedBy;
      }
      match /arNavigationSessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
        allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      }
      match /timetables/{timetableId} {
        allow read: if request.auth != null && request.auth.uid == resource.data.userId;
        allow create: if request.auth != null 
          && request.auth.uid == request.resource.data.userId
          && request.resource.data.keys().hasAll(['userId', 'day', 'startTime', 'endTime', 'course', 'venue']);
        allow update: if request.auth != null 
          && request.auth.uid == resource.data.userId
          && request.auth.uid == request.resource.data.userId;
        allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
      }
        match /locations/{locationId}/buildingPOIs/{buildingId} {
        allow read: if request.auth != null;
        allow write: if canEditLocation(locationId);

        match /floorplans/{floorNumber} {
          allow read: if request.auth != null;
          allow write: if canEditLocation(locationId);

          match /beacons/{beaconId} {
            allow read: if request.auth != null;
            allow create, update, delete: if canEditLocation(locationId);
          }
        }
      }
      match /locations/{locationId}/pathPOIs/{pathId} {
        allow read: if request.auth != null;
        allow write: if canEditLocation(locationId);
      }
      match /floorplanMetadata/{floorplanId} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
      match /locations/{locationId} {
        allow read: if request.auth != null;
      }
      match /locations/{locationId}/wifiFingerprints/{fingerprintId} {
        allow read: if request.auth != null;
        allow write: if canEditLocation(locationId);
      }
      match /locations/{locationId}/qrCodes/{qrCodeId} {
        allow read: if request.auth != null;
        allow write: if isAdmin();
      }
      match /userInformation/{userId} {
        allow create: if request.auth.uid == userId;
        allow read: if request.auth != null;
        allow update, delete: if isAdmin();
      }
    }
  }
    `,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'userInformation/admin'), {
        role: 'admin',
        adminLocations: ['up-campus'],
      });
      await setDoc(doc(context.firestore(), 'userInformation/editor'), {
        role: 'editor',
        adminLocations: ['up-campus'],
      });
      await setDoc(doc(context.firestore(), 'userInformation/user'), {
        role: 'user',
      });
    });
  });

  describe('User Data Isolation', () => {
    test('user can read/write their own users and recentlyVisited', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(setDoc(doc(user.firestore(), 'users/user'), { points: 10 }));
      await assertSucceeds(getDoc(doc(user.firestore(), 'users/user')));
      await assertSucceeds(setDoc(doc(user.firestore(), 'recentlyVisited/user'), { last: 'poi1' }));
      await assertSucceeds(getDoc(doc(user.firestore(), 'recentlyVisited/user')));
    });

    test('user cannot read/write other users data', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(getDoc(doc(user.firestore(), 'users/admin')));
      await assertFails(setDoc(doc(user.firestore(), 'users/admin'), { points: 99 }));
      await assertFails(getDoc(doc(user.firestore(), 'recentlyVisited/admin')));
    });

    test('unauthenticated cannot read/write any user data', async () => {
      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(getDoc(doc(unauthed.firestore(), 'users/user')));
      await assertFails(setDoc(doc(unauthed.firestore(), 'users/user'), { points: 1 }));
    });
  });

  
});