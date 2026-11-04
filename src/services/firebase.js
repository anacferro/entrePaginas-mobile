import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function createAuth(app) {
  if (Platform.OS === 'web' || !FirebaseAuth.getReactNativePersistence) {
    return FirebaseAuth.getAuth(app);
  }
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    return FirebaseAuth.getAuth(app);
  }
}

export const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const auth = app ? createAuth(app) : null;
function createDb(firebaseApp) {
  if (Platform.OS === 'web') return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, { experimentalForceLongPolling: true });
  } catch (e) {
    return getFirestore(firebaseApp);
  }
}

export const db = app ? createDb(app) : null;
