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
    + '|react-native-tts'
    + '|expo-font'
    + '|react-native-vector-icons'
    + ')/)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',         // supports paths like `~/screens/...`
    '^app/\\(tabs\\)/(.*)$': '<rootDir>/app/(tabs)/$1', // optional, if you still use that folder
   '^@expo/vector-icons/?(.*)$': 'react-native-vector-icons/$1',
    //'^expo-font$': '<rootDir>/__mocks__/expo-font.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
