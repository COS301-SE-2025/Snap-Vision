declare module '@react-native-firebase/auth' {
  const mockCreateUserWithEmailAndPassword: jest.Mock;
  const auth: () => {
    createUserWithEmailAndPassword: typeof mockCreateUserWithEmailAndPassword;
    signOut: jest.Mock;
  };

  export default auth;
  export { mockCreateUserWithEmailAndPassword };
}