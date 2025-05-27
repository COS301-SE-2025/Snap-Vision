import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import the type from App.tsx or define it here
export type RootStackParamList = {
  Register: undefined;
  Map: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// export const RegistrationInIndex = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const navigation = useNavigation<NavigationProp>();

//   const handleAuth = async () => {
//     try {
//       if (isRegisterMode) {
//         await auth().createUserWithEmailAndPassword(email, password);
//         Alert.alert('Success', 'User registered!');
//       } else {
//         await auth().signInWithEmailAndPassword(email, password);
//         Alert.alert('Success', 'Logged in!');
//       }
//     } catch (error: any) {
//       console.error('Auth Error:', error.message);
//       Alert.alert(isRegisterMode ? 'Registration Error' : 'Login Error', error.message);
//     }
//   };

//   return (
//     <View className='h-full w-full flex flex-col items-center justify-center bg-green-300 px-6'>
//       <TextInput
//         placeholder="Email"
//         value={email}
//         onChangeText={setEmail}
//         className="border border-black rounded-lg p-2 w-full mb-3 bg-white"
//       />
//       <TextInput
//         placeholder="Password"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//         className="border border-black rounded-lg p-2 w-full mb-3 bg-white"
//       />
//       <Button title="Register" onPress={handleRegister} />
//       <View className="mt-4">
//         <Button title="View 2D Map" onPress={() => navigation.navigate('Map')} />
//       </View>
//     </View>
//   );
// };
