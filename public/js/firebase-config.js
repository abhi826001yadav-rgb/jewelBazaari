import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    initializeAuth,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgNhB28vIQRlMOrFGoV5E7FcNk3bqMjPU",
  authDomain: "jewelbazaari.firebaseapp.com",
  projectId: "jewelbazaari",
  storageBucket: "jewelbazaari.firebasestorage.app",
  messagingSenderId: "733760448297",
  appId: "1:733760448297:web:42775cbb975bf029007938",
  measurementId: "G-Z74N8C61NX"
};

const app = initializeApp(firebaseConfig);

function createAuth() {
    try {
        return initializeAuth(app, {
            persistence: [
                indexedDBLocalPersistence,
                browserLocalPersistence,
                browserSessionPersistence
            ]
        });
    } catch (error) {
        if (error?.code === 'auth/already-initialized') {
            return getAuth(app);
        }
        throw error;
    }
}

export const auth = createAuth();
export const db = getFirestore(app);