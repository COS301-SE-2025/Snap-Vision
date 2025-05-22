import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RegistrationInIndex } from './app/(tabs)';
// import { HomeScreen } from './app/(tabs)';
// import { Registration } from './app/(tabs)/registration';
// import RegisterScreen from './app/(tabs)/RegisterScreen';
// import registration from './app/(tabs)/registration';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Register" 
          component={RegistrationInIndex} 
          options={{ title: 'Register' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}