// app/(tabs)/registration.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, Text, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function RegistrationScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleRegister = async () => {
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Account created!');
      navigation.navigate('Login'); // Go to login after registering
    } catch (error: any) {
      console.error('Registration Error:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View className="h-full w-full flex flex-col items-center justify-center bg-green-300 px-6">
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
      <Button title="Register" onPress={handleRegister} />

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text className="text-blue-600 mt-4">Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
