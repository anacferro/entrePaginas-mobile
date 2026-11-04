import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import BookshelfScreen from '../screens/BookshelfScreen';
import CreateBookScreen from '../screens/CreateBookScreen';
import ChestScreen from '../screens/ChestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReaderScreen from '../screens/ReaderScreen';
import CustomTabBar from '../components/CustomTabBar';
import LoadingView from '../components/LoadingView';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Estante"
    >
      <Tab.Screen name="Estante" component={BookshelfScreen} />
      <Tab.Screen name="CriarObra" component={CreateBookScreen} />
      <Tab.Screen name="Bau" component={ChestScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) return <LoadingView message="Abrindo sua estante..." />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="Reader"
              component={ReaderScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
