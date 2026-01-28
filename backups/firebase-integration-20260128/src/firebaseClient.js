import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCebUxuFgJNtCuCj29NssFuPdLVTRfF8W8',
  authDomain: 'consultaul-3e300.firebaseapp.com',
  projectId: 'consultaul-3e300',
  storageBucket: 'consultaul-3e300.firebasestorage.app',
  messagingSenderId: '461922540548',
  appId: '1:461922540548:web:e92e6251e39eed57086951',
  measurementId: 'G-HTR1V8KH29',
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

const FirebaseClient = {
  app,
  auth,
  db,
  functions,
  signInWithEmailAndPassword,
  signOut: firebaseSignOut,
  updatePassword: firebaseUpdatePassword,
  onAuthStateChanged: firebaseOnAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  httpsCallable,
};

window.FirebaseClient = FirebaseClient;

export { FirebaseClient };
