import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase ISW Technosys
const firebaseConfig = {
  apiKey: "AIzaSyCx4wRuGu6yTrUj5GSSV5m7SmLqpPoyvbU",
  authDomain: "isw-f05b3.firebaseapp.com",
  projectId: "isw-f05b3",
  storageBucket: "isw-f05b3.firebasestorage.app",
  messagingSenderId: "228693496282",
  appId: "1:228693496282:web:34429407b4a2235521b0e3"
};

let app;
let db = null;
let auth = null;
let isFirebaseEnabled = false;

const createSecondaryApp = (appName = 'isw-secondary-auth') => {
  if (!isFirebaseEnabled) return null;
  try {
    return getApps().some((existingApp) => existingApp.name === appName)
      ? getApp(appName)
      : initializeApp(firebaseConfig, appName);
  } catch (error) {
    console.warn('⚠️ Impossible d’initialiser l’app Firebase secondaire :', error);
    return null;
  }
};

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Activer la persistance hors ligne (Offline Persistence Cache) native de Firestore.
  // Permet de lire et écrire localement en cache quand on est offline.
  // Les données se synchronisent automatiquement avec le cloud Firebase lors du retour de la connexion.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  
  auth = getAuth(app);
  isFirebaseEnabled = true;
  console.log("✅ Firebase connecté en production avec persistance hors ligne activée (projet : isw-f05b3)");
} catch (error) {
  console.warn("⚠️ Erreur d'initialisation Firebase, bascule en mode LocalStorage pur :", error);
  isFirebaseEnabled = false;
}

export { db, auth, isFirebaseEnabled, firebaseConfig, createSecondaryApp };
