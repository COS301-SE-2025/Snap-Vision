// __mocks__/@react-native-async-storage/async-storage.ts
const mockAsyncStorage = (() => {
  let store: Record<string, string> = {};
  return {
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => (store[k] = v));
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, store[k] ?? null]))),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => delete store[k]);
      return Promise.resolve();
    }),
  };
})();
export default mockAsyncStorage;
