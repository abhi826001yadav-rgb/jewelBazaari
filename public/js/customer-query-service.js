import { db } from './firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const QUERIES_COLLECTION = 'customerQueries';

function mapQueryDoc(docSnap) {
    return {
        id: docSnap.id,
        ...docSnap.data()
    };
}

function getCreatedAtMillis(query) {
    const ts = query?.createdAt;
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
}

export async function getAllCustomerQueries() {
    const snapshot = await getDocs(collection(db, QUERIES_COLLECTION));
    return snapshot.docs
        .map(mapQueryDoc)
        .sort((a, b) => getCreatedAtMillis(b) - getCreatedAtMillis(a));
}

export async function updateCustomerQuery(queryId, data) {
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const phone = String(data.phone || '').trim();
    const subject = String(data.subject || '').trim();
    const message = String(data.message || '').trim();

    if (name.length < 2) throw new Error('Name must be at least 2 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
    if (phone.replace(/\D/g, '').length < 10) throw new Error('Phone must have at least 10 digits.');
    if (subject.length < 3) throw new Error('Subject must be at least 3 characters.');
    if (message.length < 10) throw new Error('Message must be at least 10 characters.');

    await updateDoc(doc(db, QUERIES_COLLECTION, queryId), {
        name,
        email,
        phone,
        subject,
        message,
        updatedAt: serverTimestamp()
    });
}

export async function deleteCustomerQuery(queryId) {
    await deleteDoc(doc(db, QUERIES_COLLECTION, queryId));
}