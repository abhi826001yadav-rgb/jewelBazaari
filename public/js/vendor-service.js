import { auth, db } from './firebase-config.js?v=20260707c';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707c';
import { safeGetItem, safeSetItem, safeRemoveItem } from './safe-storage.js?v=20260707c';
import { isIOSDevice } from './device-utils.js?v=20260707c';
import {
    signInWithGoogle as firebaseGoogleSignIn,
    resolveGoogleRedirectResult
} from './google-auth.js?v=20260707c';
import {
    EmailAuthProvider,
    signInWithEmailAndPassword,
    linkWithCredential,
    fetchSignInMethodsForEmail,
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
const VENDOR_EMAILS_COLLECTION = 'vendorEmails';
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
    return String(email || '').trim().toLowerCase().replace(/\s+/g, '');
}

function validateRegisteredEmail(email) {
    const clean = normalizeEmail(email);
    if (!clean) {
        throw new Error('Registered email is required.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        throw new Error('Please enter a valid registered email address.');
    }
    return clean;
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

async function getVendorByRegisteredEmail(email) {
    const cleanEmail = validateRegisteredEmail(email);
    const emailIndexRef = doc(db, VENDOR_EMAILS_COLLECTION, cleanEmail);
    const emailIndexSnap = await getDoc(emailIndexRef);

    if (emailIndexSnap.exists()) {
        const vendorId = emailIndexSnap.data().vendorId;
        const vendor = await getVendorByVendorId(vendorId);
        if (vendor) {
            return vendor;
        }
    }

    try {
        const snapshot = await getDocs(
            query(
                collection(db, VENDORS_COLLECTION),
                where('email', '==', cleanEmail)
            )
        );

        if (!snapshot.empty) {
            return mapVendorDoc(snapshot.docs[0]);
        }
    } catch (error) {
        if (error?.code !== 'permission-denied') {
            throw error;
        }
    }

    return null;
}

export async function syncVendorEmailIndex(vendor) {
    if (!vendor?.email) {
        return;
    }

    const normalizedEmail = normalizeEmail(vendor.email);
    const vendorDocId = normalizeVendorId(vendor.vendorId || vendor.id);
    if (!vendorDocId) {
        return;
    }

    await setDoc(doc(db, VENDOR_EMAILS_COLLECTION, normalizedEmail), {
        vendorId: vendor.vendorId || vendor.id,
        uid: vendor.uid,
        email: normalizedEmail,
        shopName: vendor.shopName || '',
        status: vendor.status || VENDOR_STATUS.PENDING
    }, { merge: true });
}

export async function syncAllVendorEmailIndexes(vendors = []) {
    await Promise.all(vendors.map((vendor) => syncVendorEmailIndex(vendor)));
}

async function linkVendorEmailPassword(user, email, password) {
    const credential = EmailAuthProvider.credential(normalizeEmail(email), password);

    try {
        await linkWithCredential(user, credential);
    } catch (error) {
        if (error?.code === 'auth/provider-already-linked') {
            return;
        }
        if (error?.code === 'auth/email-already-in-use') {
            throw new Error('This email already has a login method. Contact jewelBazaari support.');
        }
        throw new Error(getAuthErrorMessage(error));
    }
}

export function saveVendorSession(vendor) {
    safeSetItem(sessionStorage, VENDOR_SESSION_KEY, JSON.stringify({
        vendorId: vendor.vendorId,
        shopName: vendor.shopName,
        email: vendor.email,
        status: vendor.status,
        id: vendor.id
    }));
}

export function getVendorSession() {
    const raw = safeGetItem(sessionStorage, VENDOR_SESSION_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        safeRemoveItem(sessionStorage, VENDOR_SESSION_KEY);
        return null;
    }
}

export function clearVendorSession() {
    safeRemoveItem(sessionStorage, VENDOR_SESSION_KEY);
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

async function buildGoogleSignInResult(user) {
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
        throw new Error('This Google email already has a vendor application. Login with your registered email and vendor password after approval.');
    }

    return {
        email,
        uid: user.uid,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        profileCompleted: false
    };
}

export async function signInWithGoogle() {
    try {
        const userCredential = await firebaseGoogleSignIn();
        if (!userCredential) {
            return null;
        }

        return buildGoogleSignInResult(userCredential.user);
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}

export async function resolveVendorGoogleRedirect() {
    const result = await resolveGoogleRedirectResult();
    if (!result?.user) {
        return null;
    }

    return buildGoogleSignInResult(result.user);
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
    const vendorEmailRef = doc(db, VENDOR_EMAILS_COLLECTION, normalizeEmail(user.email));
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
        uid: user.uid,
        email: normalizeEmail(user.email),
        shopName: cleanShopName,
        status: VENDOR_STATUS.PENDING
    });

    batch.set(vendorEmailRef, {
        vendorId: cleanVendorId,
        uid: user.uid,
        email: normalizeEmail(user.email),
        shopName: cleanShopName,
        status: VENDOR_STATUS.PENDING
    });

    batch.set(credentialsRef, {
        uid: user.uid,
        vendorPasswordHash
    });

    await batch.commit();
    await linkVendorEmailPassword(user, user.email, cleanVendorPassword);
    await signOut(auth);

    return {
        vendorId: cleanVendorId,
        shopName: cleanShopName,
        email: normalizeEmail(user.email),
        status: VENDOR_STATUS.PENDING
    };
}

function assertVendorCanLogin(vendor) {
    if (!vendor.profileCompleted) {
        throw new Error('Vendor registration is incomplete. Finish vendor registration first.');
    }

    if (vendor.status === VENDOR_STATUS.REJECTED) {
        throw new Error('Your vendor application was not approved. Contact jewelBazaari support for help.');
    }

    if (vendor.status === VENDOR_STATUS.DISCONTINUED) {
        throw new Error('Your vendor account has been discontinued by admin. Contact jewelBazaari support for help.');
    }

    if (vendor.status === VENDOR_STATUS.PENDING) {
        const pendingError = new Error('Your application is under admin review. You can upload jewellery after approval.');
        pendingError.code = 'vendor/pending-approval';
        throw pendingError;
    }
}

export async function loginVendor({ email, password, onStatus } = {}) {
    const report = (message) => {
        if (typeof onStatus === 'function') {
            onStatus(message);
        }
    };

    const cleanEmail = validateRegisteredEmail(email);
    const cleanPassword = validateVendorPassword(password);

    report('Looking up vendor account...');
    const vendor = await getVendorByRegisteredEmail(cleanEmail);
    if (!vendor) {
        throw new Error('No vendor account found for this email. Use the exact email from your approved vendor registration.');
    }

    if (normalizeEmail(vendor.email) !== cleanEmail) {
        throw new Error('Registered email does not match this vendor account.');
    }

    assertVendorCanLogin(vendor);

    report('Verifying vendor password...');
    const passwordValid = await verifyVendorPassword(vendor, cleanPassword);
    if (!passwordValid) {
        throw new Error('Invalid registered email or vendor password.');
    }

    const authEmail = normalizeEmail(vendor.email);
    let userCredential;
    try {
        report('Signing in securely...');
        await auth.authStateReady();
        userCredential = await signInWithEmailAndPassword(auth, authEmail, cleanPassword);
    } catch (error) {
        if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(error?.code)) {
            if (!isIOSDevice()) {
                try {
                    const methods = await fetchSignInMethodsForEmail(auth, authEmail);
                    if (methods.includes('google.com') && !methods.includes('password')) {
                        throw new Error('Your vendor password is correct, but password login still needs activation. Contact jewelBazaari support with your registered email.');
                    }
                } catch (lookupError) {
                    if (lookupError.message?.includes('password login still needs activation')) {
                        throw lookupError;
                    }
                }
            }

            throw new Error('Invalid registered email or vendor password.');
        }

        if (error?.code === 'auth/network-request-failed') {
            throw new Error('Network error on this device. Check Wi‑Fi or mobile data, disable Private Browsing, then try again.');
        }

        throw new Error(getAuthErrorMessage(error));
    }

    if (userCredential.user.uid !== vendor.uid) {
        await signOut(auth).catch(() => {});
        throw new Error('Vendor credentials do not match this account. Contact jewelBazaari support.');
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

    const vendor = mapVendorDoc(vendorSnap);

    await updateDoc(vendorRef, {
        status: VENDOR_STATUS.APPROVED,
        approvedAt: serverTimestamp()
    });

    const vendorIdRef = doc(db, VENDOR_IDS_COLLECTION, vendorDocId);
    await setDoc(vendorIdRef, {
        vendorId: vendor.vendorId || vendorDocId,
        uid: vendor.uid,
        email: normalizeEmail(vendor.email),
        shopName: vendor.shopName || '',
        status: VENDOR_STATUS.APPROVED
    }, { merge: true });

    await syncVendorEmailIndex({
        ...vendor,
        status: VENDOR_STATUS.APPROVED
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