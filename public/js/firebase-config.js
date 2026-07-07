import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    initializeAuth,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { isIOSDevice } from "./device-utils.js?v=20260707c";

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
    const persistence = isIOSDevice()
        ? [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
        : [
            indexedDBLocalPersistence,
            browserLocalPersistence,
            browserSessionPersistence,
            inMemoryPersistence
        ];

    try {
        return initializeAuth(app, { persistence });
    } catch (error) {
        if (error?.code === 'auth/already-initialized') {
            return getAuth(app);
        }

        console.warn('initializeAuth failed; falling back to getAuth.', error);
        return getAuth(app);
    }
}

export const auth = createAuth();
export const db = getFirestore(app);