import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import RecordsMenuScreen     from '../screens/records/RecordsMenuScreen';
import ReferralsScreen from '../screens/records/ReferralsScreen';
import {
  ConsultationsScreen,
  DiagnosisScreen,
  MedicationsScreen,
  LabResultsScreen,
  RadiologyScreen,
  AllergiesScreen,
  VaccinationsScreen,
  VitalsScreen,
  SurgicalHistoryScreen,
  FamilyHistoryScreen,
    DoctorNotesScreen,
} from '../screens/records/AllRecordScreens';
const Stack = createStackNavigator();
const TEAL  = '#0B6E6E';

export default function RecordsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: TEAL },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="RecordsMenu"     component={RecordsMenuScreen}     options={{ title: 'My Health Records' }} />
      <Stack.Screen name="Consultations"   component={ConsultationsScreen}   options={{ title: 'Consultations' }} />
      <Stack.Screen name="Diagnosis"       component={DiagnosisScreen}       options={{ title: 'Diagnoses' }} />
      <Stack.Screen name="Medications"     component={MedicationsScreen}     options={{ title: 'Medications' }} />
      <Stack.Screen name="LabResults"      component={LabResultsScreen}      options={{ title: 'Lab Results' }} />
      <Stack.Screen name="Radiology"       component={RadiologyScreen}       options={{ title: 'Radiology & Imaging' }} />
      <Stack.Screen name="Allergies"       component={AllergiesScreen}       options={{ title: 'Allergies' }} />
      <Stack.Screen name="Vaccinations"    component={VaccinationsScreen}    options={{ title: 'Vaccinations' }} />
      <Stack.Screen name="Vitals"          component={VitalsScreen}          options={{ title: 'Vital Signs' }} />
      <Stack.Screen name="SurgicalHistory" component={SurgicalHistoryScreen} options={{ title: 'Surgical History' }} />
      <Stack.Screen name="FamilyHistory"   component={FamilyHistoryScreen}   options={{ title: 'Family History' }} />
      <Stack.Screen name="Referrals"       component={ReferralsScreen}       options={{ title: 'Referrals' }} />
      <Stack.Screen name="DoctorNotes"     component={DoctorNotesScreen}     options={{ title: 'Doctor Notes' }} />
    </Stack.Navigator>
  );
}