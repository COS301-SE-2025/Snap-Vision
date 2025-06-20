// __mocks__/@react-native-firebase/auth.ts
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();

const auth = () => ({
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
});

// Attach the mocks directly for test access
(auth as any).mockCreateUserWithEmailAndPassword = mockCreateUserWithEmailAndPassword;
(auth as any).mockSignInWithEmailAndPassword = mockSignInWithEmailAndPassword;

export default auth;
