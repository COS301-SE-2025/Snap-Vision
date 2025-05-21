// // src/screens/RegisterScreen.tsx
// import React, { useState } from 'react';
// import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
// import { auth } from '../../firebaseConfig';

// const RegisterScreen = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const handleRegister = async () => {
//     try {
//       await auth().createUserWithEmailAndPassword(email.trim(), password);
//       Alert.alert('Success', 'User registered successfully');
//     } catch (error: any) {
//       Alert.alert('Registration Error', error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Register</Text>
//       <TextInput
//         placeholder="Email"
//         style={styles.input}
//         autoCapitalize="none"
//         keyboardType="email-address"
//         onChangeText={setEmail}
//         value={email}
//       />
//       <TextInput
//         placeholder="Password"
//         style={styles.input}
//         secureTextEntry
//         onChangeText={setPassword}
//         value={password}
//       />
//       <Button title="Register" onPress={handleRegister} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1, justifyContent: 'center', padding: 20
//   },
//   input: {
//     borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10, borderRadius: 5
//   },
//   title: {
//     fontSize: 24, marginBottom: 20, textAlign: 'center'
//   }
// });

// export default RegisterScreen;
