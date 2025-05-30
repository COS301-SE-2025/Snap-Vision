module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native'
    + '|@react-native'
    + '|@react-navigation'
    + '|expo(nent)?'
    + '|@expo(nent)?'
    + '|expo-modules-core'
    + '|react-clone-referenced-element'
    + '|react-native-svg'
    + '|native-base'
    + ')/)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',         // supports paths like `~/screens/...`
    '^app/\\(tabs\\)/(.*)$': '<rootDir>/app/(tabs)/$1', // optional, if you still use that folder
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
