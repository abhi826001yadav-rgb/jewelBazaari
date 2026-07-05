import { auth, db } from './firebase-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const VENDORS_COLLECTION = 'vendors';
const VENDOR_IDS_COLLECTION = 'vendorIds';
const VENDOR_CREDENTIALS_COLLECTION = 'vendorCredentials';
const VENDOR_SESSION_KEY = 'jb_vendor_session';

export const VENDOR_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    DISCONTINUED: 'discontinued'
};

function normalizeVendorId(vendorId) {
    return String(vendorId || '').trim().toLowerCase();
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateVendorId(vendorId) {
    const trimmed = String(vendorId || '').trim();
    if (!trimmed) {
        throw new Error('Vendor ID is required.');
    }
    if (trimmed.length < 4 || trimmed.length > 32) {
        throw new Error('Vendor ID must be between 4 and 32 characters.');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        throw new Error('Vendor ID can only contain letters, numbers, hyphens, and underscores.');
    }
    return trimmed;
}

function validateVendorPassword(password) {
    const clean = String(password || '');
    if (clean.length < 6) {
        throw new Error('Vendor password must be at least 6 characters.');
    }
    return clean;
}

function mapVendorDoc(docSnap) {
    const { vendorPasswordHash, ...data } = docSnap.data();
    return {
        id: docSnap.id,
        ...data
    };
}

async function getVendorPasswordHash(vendor) {
    const vendorId = normalizeVendorId(vendor.vendorId || vendor.id);
    if (!vendorId) {
        return null;
    }

    const credentialsRef = doc(db, VENDOR_CREDENTIALS_COLLECTION, vendorId);
    const credentialsSnap = await getDoc(credentialsRef);
    if (credentialsSnap.exists()) {
        return credentialsSnap.data().vendorPasswordHash || null;
    }

    const legacySnap = await getDoc(doc(db, VENDORS_COLLECTION, vendorId));
    return legacySnap.exists() ? legacySnap.data().vendorPasswordHash || null : null;
}

async function hashVendorPassword(vendorId, password) {
    const payload = `${normalizeVendorId(vendorId)}:${password}`;
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function verifyVendorPassword(vendor, password) {
    const storedHash = await getVendorPasswordHash(vendor);
    if (!storedHash) {
        return false;
    }

    const expected = await hashVendorPassword(vendor.vendorId || vendor.id, password);
    return expected === storedHash;
}

async function signInVendorWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        return await signInWithPopup(auth, provider);
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}

export function saveVendorSession(vendor) {
    sessionStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify({
        vendorId: vendor.vendorId,
        shopName: vendor.shopName,
        email: vendor.email,
        status: vendor.status,
        id: vendor.id
    }));
}

export function getVendorSession() {
    const raw = sessionStorage.getItem(VENDOR_SESSION_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        sessionStorage.removeItem(VENDOR_SESSION_KEY);
        return null;
    }
}

export function clearVendorSession() {
    sessionStorage.removeItem(VENDOR_SESSION_KEY);
}

export async function isVendorIdAvailable(vendorId) {
    const normalizedId = normalizeVendorId(validateVendorId(vendorId));
    const vendorIdRef = doc(db, VENDOR_IDS_COLLECTION, normalizedId);
    const snapshot = await getDoc(vendorIdRef);
    return !snapshot.exists();
}

export async function getVendorProfileByUid(uid) {
    const snapshot = await getDocs(
        query(
            collection(db, VENDORS_COLLECTION),
            where('uid', '==', uid)
        )
    );

    if (snapshot.empty) {
        return null;
    }

    return mapVendorDoc(snapshot.docs[0]);
}

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let userCredential;
    try {
        userCredential = await signInWithPopup(auth, provider);
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }

    const user = userCredential.user;
    const email = normalizeEmail(user.email);

    if (!email) {
        await signOut(auth).catch(() => {});
        throw new Error('Google account must have an email address.');
    }

    const existingProfile = await getVendorProfileByUid(user.uid);
    if (existingProfile?.profileCompleted) {
        return {
            email,
            uid: user.uid,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            profileCompleted: true,
            vendorProfile: existingProfile
        };
    }

    const existingByEmail = await getVendorProfileByEmail(email);
    if (existingByEmail?.profileCompleted && existingByEmail.uid !== user.uid) {
        await signOut(auth).catch(() => {});
        throw new Error('This Google email already has a vendor application. Login with your vendor password after approval.');
    }

    return {
        email,
        uid: user.uid,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        profileCompleted: false
    };
}

export async function getVendorProfileByEmail(email) {
    const cleanEmail = normalizeEmail(email);
    const snapshot = await getDocs(
        query(
            collection(db, VENDORS_COLLECTION),
            where('email', '==', cleanEmail)
        )
    );

    if (snapshot.empty) {
        return null;
    }

    return mapVendorDoc(snapshot.docs[0]);
}

export async function getRegistrationProgress() {
    const user = auth.currentUser;
    if (!user) {
        return { step: 1, user: null, emailVerified: false, vendorProfile: null };
    }

    await user.reload();
    const vendorProfile = await getVendorProfileByUid(user.uid);

    if (vendorProfile) {
        return {
            step: 3,
            user,
            email: user.email,
            emailVerified: user.emailVerified,
            vendorProfile
        };
    }

    return {
        step: 2,
        user,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: true,
        vendorProfile: null
    };
}

export async function completeVendorProfile({ shopName, vendorId, vendorPassword, vendorPasswordConfirm }) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Please sign in with Google on Page 1 first.');
    }

    await user.reload();

    const cleanShopName = String(shopName || '').trim();
    const cleanVendorId = validateVendorId(vendorId);
    const normalizedVendorId = normalizeVendorId(cleanVendorId);
    const cleanVendorPassword = validateVendorPassword(vendorPassword);
    const cleanConfirm = String(vendorPasswordConfirm || '');

    if (!cleanShopName) {
        throw new Error('Shop name is required.');
    }

    if (cleanVendorPassword !== cleanConfirm) {
        throw new Error('Vendor passwords do not match.');
    }

    const existingForUid = await getVendorProfileByUid(user.uid);
    if (existingForUid) {
        throw new Error('Your vendor profile is already submitted.');
    }

    const vendorRef = doc(db, VENDORS_COLLECTION, normalizedVendorId);
    const existingVendor = await getDoc(vendorRef);
    if (existingVendor.exists()) {
        throw new Error('This Vendor ID is already taken. Choose a different one.');
    }

    const vendorPasswordHash = await hashVendorPassword(cleanVendorId, cleanVendorPassword);
    const vendorIdRef = doc(db, VENDOR_IDS_COLLECTION, normalizedVendorId);
    const credentialsRef = doc(db, VENDOR_CREDENTIALS_COLLECTION, normalizedVendorId);
    const batch = writeBatch(db);

    batch.set(vendorRef, {
        vendorId: cleanVendorId,
        shopName: cleanShopName,
        email: normalizeEmail(user.email),
        uid: user.uid,
        status: VENDOR_STATUS.PENDING,
        emailVerified: true,
        authProvider: 'google',
        profileCompleted: true,
        createdAt: serverTimestamp()
    });

    batch.set(vendorIdRef, {
        vendorId: cleanVendorId,
        uid: user.uid
    });

    batch.set(credentialsRef, {
        uid: user.uid,
        vendorPasswordHash
    });

    await batch.commit();

    await signOut(auth);

    return {
        vendorId: cleanVendorId,
        shopName: cleanShopName,
        email: normalizeEmail(user.email),
        status: VENDOR_STATUS.PENDING
    };
}

export async function loginVendor({ password }) {
    const cleanPassword = validateVendorPassword(password);

    const userCredential = await signInVendorWithGoogle();
    const vendor = await getVendorProfileByUid(userCredential.user.uid);

    if (!vendor) {
        await signOut(auth).catch(() => {});
        throw new Error('No vendor account found for this Google account. Register first or use the Google account from registration.');
    }

    if (!vendor.profileCompleted) {
        await signOut(auth).catch(() => {});
        throw new Error('Vendor registration is incomplete. Finish vendor registration first.');
    }

    const passwordValid = await verifyVendorPassword(vendor, cleanPassword);
    if (!passwordValid) {
        await signOut(auth).catch(() => {});
        throw new Error('Invalid vendor password.');
    }

    if (!vendor.emailVerified) {
        await signOut(auth).catch(() => {});
        const verificationError = new Error('Please verify your email before logging in.');
        verificationError.code = 'auth/email-not-verified';
        verificationError.email = vendor.email;
        throw verificationError;
    }

    if (vendor.status === VENDOR_STATUS.REJECTED) {
        await signOut(auth).catch(() => {});
        throw new Error('Your vendor application was not approved. Contact jewelBazaari support for help.');
    }

    if (vendor.status === VENDOR_STATUS.DISCONTINUED) {
        await signOut(auth).catch(() => {});
        throw new Error('Your vendor account has been discontinued by admin. Contact jewelBazaari support for help.');
    }

    if (vendor.status === VENDOR_STATUS.PENDING) {
        await signOut(auth).catch(() => {});
        const pendingError = new Error('Your application is under admin review. You can upload jewellery after approval.');
        pendingError.code = 'vendor/pending-approval';
        throw pendingError;
    }

    const sessionVendor = {
        ...vendor,
        emailVerified: true
    };

    saveVendorSession(sessionVendor);
    return sessionVendor;
}

export async function logoutVendor() {
    clearVendorSession();
    await signOut(auth);
}

export async function getVendorByVendorId(vendorId) {
    const normalizedVendorId = normalizeVendorId(vendorId);
    const vendorSnap = await getDoc(doc(db, VENDORS_COLLECTION, normalizedVendorId));
    if (!vendorSnap.exists()) {
        return null;
    }
    return mapVendorDoc(vendorSnap);
}

export async function getAllVendorRequests() {
    try {
        const snapshot = await getDocs(
            query(
                collection(db, VENDORS_COLLECTION),
                orderBy('createdAt', 'desc')
            )
        );
        return snapshot.docs.map(mapVendorDoc);
    } catch (error) {
        const snapshot = await getDocs(collection(db, VENDORS_COLLECTION));
        return snapshot.docs
            .map(mapVendorDoc)
            .sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });
    }
}

export async function getPendingVendorRequests() {
    const all = await getAllVendorRequests();
    return all.filter((vendor) => vendor.status === VENDOR_STATUS.PENDING);
}

export async function approveVendor(vendorDocId) {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorDocId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
        throw new Error('Vendor request not found.');
    }

    await updateDoc(vendorRef, {
        status: VENDOR_STATUS.APPROVED,
        approvedAt: serverTimestamp()
    });

    return mapVendorDoc(await getDoc(vendorRef));
}

export async function rejectVendor(vendorDocId) {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorDocId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
        throw new Error('Vendor request not found.');
    }

    await updateDoc(vendorRef, {
        status: VENDOR_STATUS.REJECTED,
        rejectedAt: serverTimestamp()
    });

    return mapVendorDoc(await getDoc(vendorRef));
}

export async function discontinueVendor(vendorDocId) {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorDocId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
        throw new Error('Vendor not found.');
    }

    const vendor = mapVendorDoc(vendorSnap);
    if (vendor.status !== VENDOR_STATUS.APPROVED) {
        throw new Error('Only approved vendors can be discontinued.');
    }

    await updateDoc(vendorRef, {
        status: VENDOR_STATUS.DISCONTINUED,
        discontinuedAt: serverTimestamp()
    });

    return mapVendorDoc(await getDoc(vendorRef));
}

export async function getCurrentApprovedVendor() {
    const session = getVendorSession();
    if (!session?.vendorId) {
        return null;
    }

    const vendor = await getVendorByVendorId(session.vendorId);
    if (!vendor || vendor.status !== VENDOR_STATUS.APPROVED) {
        clearVendorSession();
        return null;
    }

    const user = auth.currentUser;
    if (!user || user.uid !== vendor.uid) {
        clearVendorSession();
        return null;
    }

    return vendor;
}

export function watchVendorAuth(callback) {
    return onAuthStateChanged(auth, callback);
}