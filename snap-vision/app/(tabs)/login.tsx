// app/(tabs)/login.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Logged in!');
      navigation.navigate('Home'); // Navigate to Home after login
    } catch (error: any) {
      console.error('Login Error:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View className="h-full w-full flex flex-col items-center justify-center bg-blue-200 px-6">
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="border border-black rounded-lg p-2 w-full mb-3 bg-white"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        className="border border-black rounded-lg p-2 w-full mb-3 bg-white"
      />
      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text className="text-blue-600 mt-4">Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}
