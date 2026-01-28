import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FarmerRegistrationScreen from './src/screens/FarmerRegistrationScreen';
import RegisteredFarmersScreen from './src/screens/RegisteredFarmersScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="FarmerRegistration"
        screenOptions={{
          headerStyle: { backgroundColor: '#1B5E20' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
        }}>
        <Stack.Screen
          name="FarmerRegistration"
          component={FarmerRegistrationScreen}
          options={{ title: 'Farmer Registration' }}
        />
        <Stack.Screen
          name="RegisteredFarmers"
          component={RegisteredFarmersScreen}
          options={{ title: 'Registered Farmers' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
