import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Import the type from App.tsx or define it here
export type RootStackParamList = {
  Register: undefined;
  Map: undefined;
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RegistrationInIndex = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<NavigationProp>();

  const handleRegister = async () => {
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'User registered!');
    } catch (error: any) {
      console.error('Registration Error:', error.message);
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View className='h-full w-full flex flex-col items-center justify-center bg-green-300'>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border border-black rounded-lg p-2"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border border-black rounded-lg p-2"
      />
      <Button title="Register" onPress={handleRegister} />
      <View className="mt-4">
        <Button title="View 2D Map" onPress={() => navigation.navigate('Map')} />
      </View>
    </View>
  );
};
