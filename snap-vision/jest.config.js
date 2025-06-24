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
    '^app/\\(tabs\\)/(.*)$': '<rootDir>/app/(tabs)/$1', 
   '^@expo/vector-icons/?(.*)$': 'react-native-vector-icons/$1',
    //'^expo-font$': '<rootDir>/__mocks__/expo-font.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],

  collectCoverage: false, // Set to true if you want to collect coverage

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/__tests__/**',         
    '!**/index.{ts,tsx}',        
    '!**/*.d.ts',                
  ],

  coverageDirectory: 'coverage',
};
