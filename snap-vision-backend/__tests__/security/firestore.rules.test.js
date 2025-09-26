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

  describe('Role-Based Access Control', () => {
    test('admin can write to RoomPOIs, PathPOIs, UPcampusPOIs', async () => {
      const admin = testEnv.authenticatedContext('admin');
      await assertSucceeds(setDoc(doc(admin.firestore(), 'RoomPOIs/room1'), { name: 'Room 1' }));
      await assertSucceeds(setDoc(doc(admin.firestore(), 'PathPOIs/path1'), { name: 'Path 1' }));
      await assertSucceeds(setDoc(doc(admin.firestore(), 'UPcampusPOIs/building1'), { name: 'Building 1' }));
    });

    test('user cannot write to RoomPOIs, PathPOIs, UPcampusPOIs', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(setDoc(doc(user.firestore(), 'RoomPOIs/room1'), { name: 'Room 1' }));
      await assertFails(setDoc(doc(user.firestore(), 'PathPOIs/path1'), { name: 'Path 1' }));
      await assertFails(setDoc(doc(user.firestore(), 'UPcampusPOIs/building1'), { name: 'Building 1' }));
    });

    test('editor can write to assigned location roomPOIs', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertSucceeds(setDoc(doc(editor.firestore(), 'locations/up-campus/roomPOIs/room1'), { name: 'Room' }));
      await assertFails(setDoc(doc(editor.firestore(), 'locations/other-campus/roomPOIs/room1'), { name: 'Room' }));
    });
  });

  describe('Crowd Reports', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'crowdReports/report1'), {
          reportedBy: 'user',
          status: 'open',
        });
      });
    });

    test('user can create crowdReport', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(setDoc(doc(user.firestore(), 'crowdReports/report2'), { reportedBy: 'user', status: 'open' }));
    });

    test('user can update/delete their own report', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(updateDoc(doc(user.firestore(), 'crowdReports/report1'), { status: 'closed' }));
      await assertSucceeds(deleteDoc(doc(user.firestore(), 'crowdReports/report1')));
    });

    test('user cannot update/delete others report', async () => {
      const other = testEnv.authenticatedContext('other');
      await assertFails(updateDoc(doc(other.firestore(), 'crowdReports/report1'), { status: 'closed' }));
      await assertFails(deleteDoc(doc(other.firestore(), 'crowdReports/report1')));
    });
  });

  describe('AR Navigation Sessions', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'arNavigationSessions/session1'), {
          userId: 'user',
        });
      });
    });

    test('user can read/write their own AR session', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'arNavigationSessions/session1')));
      await assertSucceeds(setDoc(doc(user.firestore(), 'arNavigationSessions/session1'), { userId: 'user' }));
    });

    test('user cannot read/write others AR session', async () => {
      const other = testEnv.authenticatedContext('other');
      await assertFails(getDoc(doc(other.firestore(), 'arNavigationSessions/session1')));
      await assertFails(setDoc(doc(other.firestore(), 'arNavigationSessions/session1'), { userId: 'other' }));
    });
  });

  describe('Timetables', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'timetables/timetable1'), {
          userId: 'user',
          day: 'Monday',
          startTime: '08:00',
          endTime: '09:00',
          course: 'Math',
          venue: 'Room 1',
        });
      });
    });

    test('user can read their own timetable', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'timetables/timetable1')));
    });

    test('user cannot read others timetable', async () => {
      const other = testEnv.authenticatedContext('other');
      await assertFails(getDoc(doc(other.firestore(), 'timetables/timetable1')));
    });

    test('user can create timetable with correct fields', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(setDoc(doc(user.firestore(), 'timetables/timetable2'), {
        userId: 'user',
        day: 'Tuesday',
        startTime: '10:00',
        endTime: '11:00',
        course: 'Science',
        venue: 'Room 2',
      }));
    });

    test('user cannot create timetable for another user', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(setDoc(doc(user.firestore(), 'timetables/timetable3'), {
        userId: 'other',
        day: 'Wednesday',
        startTime: '12:00',
        endTime: '13:00',
        course: 'History',
        venue: 'Room 3',
      }));
    });
  });
    describe('Building POIs and Floorplans', () => {
    test('authenticated user can read buildingPOIs and floorplans', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus/buildingPOIs/building1')));
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1')));
    });
  
    test('editor can write buildingPOIs and floorplans for assigned location', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertSucceeds(setDoc(doc(editor.firestore(), 'locations/up-campus/buildingPOIs/building1'), { name: 'B1' }));
      await assertSucceeds(setDoc(doc(editor.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1'), { name: 'F1' }));
    });
  
    test('editor cannot write buildingPOIs for unassigned location', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertFails(setDoc(doc(editor.firestore(), 'locations/other-campus/buildingPOIs/building1'), { name: 'B1' }));
    });
  
    test('editor can create/update/delete beacons for assigned location', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertSucceeds(setDoc(doc(editor.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1'), { id: 'beacon1' }));
      await assertSucceeds(updateDoc(doc(editor.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1'), { id: 'beacon1-updated' }));
      await assertSucceeds(deleteDoc(doc(editor.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1')));
    });
  
    test('user can read beacons but cannot write', async () => {
      const user = testEnv.authenticatedContext('user');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1'), { id: 'beacon1' });
      });
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1')));
      await assertFails(setDoc(doc(user.firestore(), 'locations/up-campus/buildingPOIs/building1/floorplans/1/beacons/beacon1'), { id: 'fail' }));
    });
  });
  
  describe('Path POIs', () => {
    test('authenticated user can read pathPOIs', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus/pathPOIs/path1')));
    });
  
    test('editor can write pathPOIs for assigned location', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertSucceeds(setDoc(doc(editor.firestore(), 'locations/up-campus/pathPOIs/path1'), { name: 'Path' }));
    });
  
    test('editor cannot write pathPOIs for unassigned location', async () => {
      const editor = testEnv.authenticatedContext('editor');
      await assertFails(setDoc(doc(editor.firestore(), 'locations/other-campus/pathPOIs/path1'), { name: 'Path' }));
    });
  });
  
  describe('Floorplan Metadata', () => {
    test('authenticated user can read floorplanMetadata', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'floorplanMetadata/floorplan1')));
    });
  
    test('admin can write floorplanMetadata', async () => {
      const admin = testEnv.authenticatedContext('admin');
      await assertSucceeds(setDoc(doc(admin.firestore(), 'floorplanMetadata/floorplan1'), { name: 'Meta' }));
    });
  
    test('user cannot write floorplanMetadata', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(setDoc(doc(user.firestore(), 'floorplanMetadata/floorplan1'), { name: 'Meta' }));
    });
  });
  
  describe('Location', () => {
    test('authenticated user can read location', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus')));
    });
  });
  
  describe('QR Codes', () => {
    test('authenticated user can read qrCodes', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'locations/up-campus/qrCodes/qr1')));
    });
  
    test('admin can write qrCodes', async () => {
      const admin = testEnv.authenticatedContext('admin');
      await assertSucceeds(setDoc(doc(admin.firestore(), 'locations/up-campus/qrCodes/qr1'), { code: '123' }));
    });
  
    test('user cannot write qrCodes', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(setDoc(doc(user.firestore(), 'locations/up-campus/qrCodes/qr1'), { code: '123' }));
    });
  });
  
  describe('User Information', () => {
  
    test('user cannot create other userInformation', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(setDoc(doc(user.firestore(), 'userInformation/other'), { role: 'user' }));
    });
  
    test('user can read their own userInformation', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertSucceeds(getDoc(doc(user.firestore(), 'userInformation/user')));
    });
  
    test('admin can update/delete any userInformation', async () => {
      const admin = testEnv.authenticatedContext('admin');
      await assertSucceeds(updateDoc(doc(admin.firestore(), 'userInformation/user'), { role: 'user-updated' }));
      await assertSucceeds(deleteDoc(doc(admin.firestore(), 'userInformation/user')));
    });
  
    test('user cannot update/delete other userInformation', async () => {
      const user = testEnv.authenticatedContext('user');
      await assertFails(updateDoc(doc(user.firestore(), 'userInformation/admin'), { role: 'admin-updated' }));
      await assertFails(deleteDoc(doc(user.firestore(), 'userInformation/admin')));
    });
  });
});