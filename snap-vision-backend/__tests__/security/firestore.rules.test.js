const { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds,
  RulesTestEnvironment 
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');;

describe('Snap Vision Security Tests', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'snap-vision-security-test',
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {

              // Helper functions
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

              // USER ISOLATION TESTS - Core security requirement
              match /users/{userId} {
                allow read, write: if request.auth != null && request.auth.uid == userId;
              }
              
              match /recentlyVisited/{userId} {
                allow read, write: if request.auth != null && request.auth.uid == userId;
              }

              match /userInformation/{userId} {
                allow create: if request.auth.uid == userId;
                allow read: if request.auth != null;
                allow update, delete: if isAdmin();
              }

              // RBAC TESTS - Role-based access control
              match /UPcampusPOIs/{document=**} {
                allow read: if request.auth != null;
                allow write: if isAdmin();
              }
              
              match /RoomPOIs/{roomId} {
                allow read: if request.auth != null;
                allow write: if isAdmin();
              }

              match /locations/{locationId}/roomPOIs/{roomId} {
                allow read: if request.auth != null;
                allow write: if canEditLocation(locationId);
              }
            }
          }
        `
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Core Security: User Data Isolation', () => {
    beforeEach(async () => {
      // Setup test user data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'userInformation/alice'), {
          role: 'user',
          email: 'alice@test.com'
        });
        await setDoc(doc(context.firestore(), 'userInformation/bob'), {
          role: 'user', 
          email: 'bob@test.com'
        });
        await setDoc(doc(context.firestore(), 'userInformation/admin'), {
          role: 'admin',
          email: 'admin@test.com'
        });
      });
    });

    test('users cannot access other users personal data', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      const bobUserRef = doc(alice.firestore(), 'users/bob');
      await assertFails(getDoc(bobUserRef));
      
      const bobRecentRef = doc(alice.firestore(), 'recentlyVisited/bob');
      await assertFails(getDoc(bobRecentRef));
    });

    test('users can access their own personal data', async () => {
      const alice = testEnv.authenticatedContext('alice');
      
      const aliceUserRef = doc(alice.firestore(), 'users/alice');
      await assertSucceeds(getDoc(aliceUserRef));
      
      const aliceRecentRef = doc(alice.firestore(), 'recentlyVisited/alice');
      await assertSucceeds(getDoc(aliceRecentRef));
    });

    test('unauthenticated users cannot access any personal data', async () => {
      const unauthed = testEnv.unauthenticatedContext();
      
      const userRef = doc(unauthed.firestore(), 'users/alice');
      await assertFails(getDoc(userRef));
    });
  });

  describe('RBAC: Role-Based Access Control', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'userInformation/admin'), {
          role: 'admin'
        });
        await setDoc(doc(context.firestore(), 'userInformation/editor'), {
          role: 'editor',
          adminLocations: ['up-campus']
        });
        await setDoc(doc(context.firestore(), 'userInformation/user'), {
          role: 'user'
        });
      });
    });

    test('admin can write to POI collections', async () => {
      const admin = testEnv.authenticatedContext('admin');
      
      const poiRef = doc(admin.firestore(), 'UPcampusPOIs/building1');
      await assertSucceeds(setDoc(poiRef, {
        name: 'New Building',
        coordinates: { lat: -25.755, lng: 28.229 }
      }));
      
      const roomRef = doc(admin.firestore(), 'RoomPOIs/room1');
      await assertSucceeds(setDoc(roomRef, {
        name: 'New Room',
        capacity: 50
      }));
    });

    test('regular users cannot write to POI collections', async () => {
      const user = testEnv.authenticatedContext('user');
      
      const poiRef = doc(user.firestore(), 'UPcampusPOIs/building1');
      await assertFails(setDoc(poiRef, {
        name: 'New Building'
      }));
      
      const roomRef = doc(user.firestore(), 'RoomPOIs/room1');
      await assertFails(setDoc(roomRef, {
        name: 'New Room'
      }));
    });

    test('editor can only write to assigned locations', async () => {
      const editor = testEnv.authenticatedContext('editor');
      
      const assignedRef = doc(editor.firestore(), 'locations/up-campus/roomPOIs/room1');
      await assertSucceeds(setDoc(assignedRef, {
        name: 'Updated Room'
      }));
      
      // Editor tries to write to non-assigned location - should FAIL
      const nonAssignedRef = doc(editor.firestore(), 'locations/wits-campus/roomPOIs/room1');
      await assertFails(setDoc(nonAssignedRef, {
        name: 'Updated Room'
      }));
    });
  });
});