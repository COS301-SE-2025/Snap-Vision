module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-firebase|@react-navigation|expo(nent)?|@expo(nent)?|expo-modules-core|react-clone-referenced-element|react-native-svg|native-base|react-native-tts|expo-font|expo-asset|react-native-vector-icons|react-native-fs|react-native-image-picker|@react-native-async-storage)/',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  //setupFiles: ['<rootDir>/__tests__/helpers/setup-jest.js'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@expo/vector-icons/?(.*)$': 'react-native-vector-icons/$1',
    '^@react-native-firebase/(.*)$': '<rootDir>/node_modules/@react-native-firebase/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.js?(x)',
    '**/__tests__/**/*.test.ts?(x)',
    '<rootDir>/detox/tests/**/*.test.js',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/organisms/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/index.{ts,tsx}',
    '!**/*.d.ts',
    '!src/components/organisms/AdminFloorplanEditorContent.tsx',
    '!src/components/organisms/ManageUsersForm.tsx',
    'src/utils/*.{ts,tsx}'
  ],
  coverageDirectory: 'coverage',
};
