import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { auth } from './firebase';
console.log('AUTH OBJECT:', auth);
import { createUserWithEmailAndPassword } from 'firebase/auth';

const Registration = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', 'User registered!');
    } catch (error: any) {
      console.error('Registration Error:', error.message);
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View>
      <TextInput placeholder="Email" onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry onChangeText={setPassword} />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
};

export default Registration;
