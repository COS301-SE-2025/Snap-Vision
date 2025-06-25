module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-firebase|@react-navigation|expo(nent)?|@expo(nent)?|expo-modules-core|react-clone-referenced-element|react-native-svg|native-base|react-native-tts|expo-font|expo-asset|react-native-vector-icons)/',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['<rootDir>/__tests__/helpers/setup-jest.js'],
  moduleNameMapper: {   
  '^~/(.*)$': '<rootDir>/src/$1',
  '^app/\\(tabs\\)/(.*)$': '<rootDir>/app/(tabs)/$1', 
  '^@expo/vector-icons/?(.*)$': 'react-native-vector-icons/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '<rootDir>/detox/tests/**/*.test.js'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/index.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['babel-preset-expo'],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }]
  }
};