// Mock fetch
global.fetch = require('jest-fetch-mock');

// Ensure environment variables for Firebase emulators are set
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';