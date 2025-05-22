import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

export const RegistrationInIndex = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    </View>
  );
};
