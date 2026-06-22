// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2qTMc6KyLQPQWfCk7ENJAwzS8vqobc18",
  authDomain: "jewelbazaari.firebaseapp.com",
  projectId: "jewelbazaari",
  storageBucket: "jewelbazaari.appspot.com",
  messagingSenderId: "733760448297",
  appId: "1:733760448297:web:421633a1e0fab027007938",
  measurementId: "G-KTJKGE3PWJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);