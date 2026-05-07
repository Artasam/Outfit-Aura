// Firebase SDKs import 
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Import Firestore
import { GoogleAuthProvider } from "firebase/auth"; // ✅ Add this impor


// Firebase Config with direct credentials
const firebaseConfig = {
  apiKey: "AIzaSyARUFsFU2stcAHshQ2zs-_fTbiuIGtKcTc",
  authDomain: "outfitaura-e8201.firebaseapp.com",
  projectId: "outfitaura-e8201",
  storageBucket: "outfitaura-e8201.firebasestorage.app",
  messagingSenderId: "207698326112",
  appId: "1:207698326112:web:90a9ed52698b816ef18905",
  measurementId: "G-4ZW4BY5L3B"
};

// Firebase initialize 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // ✅ Initialize Firestore
const provider = new GoogleAuthProvider(); // ✅ this line

export { auth, db, provider }; // ✅ Now you're exporting the Google provider too


