import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Firebase configuration
// Note: Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
}

// Initialize Firebase with error handling
let app
let db
let auth

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
} catch (error) {
  console.error('Error initializing Firebase:', error)
  // Create dummy objects to prevent import errors
  app = {} as any
  db = {} as any
  auth = {} as any
}

// Connect to emulators in development (optional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    if (db && typeof db !== 'object' || (typeof db === 'object' && Object.keys(db).length > 0)) {
      connectFirestoreEmulator(db, 'localhost', 8080)
    }
    if (auth && typeof auth !== 'object' || (typeof auth === 'object' && Object.keys(auth).length > 0)) {
      connectAuthEmulator(auth, 'http://localhost:9099')
    }
  } catch (error) {
    console.log('Firebase emulators already connected or not available')
  }
}

export { db, auth }
export default app

