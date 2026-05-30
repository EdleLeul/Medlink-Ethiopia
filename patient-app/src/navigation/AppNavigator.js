import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TravelScreen from '../screens/travel/TravelScreen';

// Auth screens
import WelcomeScreen    from '../screens/auth/WelcomeScreen';
import RegisterScreen   from '../screens/auth/RegisterScreen';
import LoginScreen      from '../screens/auth/LoginScreen';

// Main screens
import HomeScreen            from '../screens/dashboard/HomeScreen';
import AccessLogScreen       from '../screens/access/AccessLogScreen';
import OTPApprovalScreen     from '../screens/access/OTPApprovalScreen';
import ChildrenListScreen    from '../screens/children/ChildrenListScreen';
import AddChildScreen        from '../screens/children/AddChildScreen';

// Records
import RecordsNavigator from './RecordsNavigator';

import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();
const TEAL  = '#0B6E6E';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   TEAL,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor:  '#E5E7EB',
          paddingBottom:   4,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home:         'home-outline',
            Records:      'document-text-outline',
            Family:       'people-outline',
            Travel:       'airplane-outline',
            Access:       'shield-checkmark-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen} />
      <Tab.Screen name="Records"      component={RecordsNavigator} />
      <Tab.Screen name="Family"       component={ChildrenListScreen} />
      <Tab.Screen name="Travel"       component={TravelScreen} />
      <Tab.Screen name="Access"       component={AccessLogScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const user = useAuthStore(s => s.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome"  component={WelcomeScreen} />
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"       component={MainTabs} />
            <Stack.Screen name="OTPApproval" component={OTPApprovalScreen} />
            <Stack.Screen name="AddChild"   component={AddChildScreen} />
                      </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}