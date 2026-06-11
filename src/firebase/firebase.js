// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeYetGAS6Gvsgxg_REAm4YHbvLaXa_Qhc",
  authDomain: "billing-ee8ac.firebaseapp.com",
  projectId: "billing-ee8ac",
  storageBucket: "billing-ee8ac.firebasestorage.app",
  messagingSenderId: "727291094051",
  appId: "1:727291094051:web:68a99743a1cb6b8b13bd96",
  measurementId: "G-Q48ZPDQT1K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);

// Configure Firebase Auth to use session-only persistence (isolated per browser tab)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      console.log("Firebase Auth persistence set to session-only (isolated tabs).");
    })
    .catch((error) => {
      console.error("Failed to set Firebase Auth persistence:", error);
    });
}

const db = getFirestore(app);

export { app, analytics, auth, db, firebaseConfig };
