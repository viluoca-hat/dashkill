import { firebaseConfig } from './config.js';

let db = null;

export function initializeFirebase() {
    if (db) return db;
    const app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    return db;
}

export async function sendDataToFirebase(data) {
    const database = initializeFirebase();
    const ref = database.ref('visitors/' + data.sessionId);
    await ref.set(data);
    return true;
}

export function saveFallback(data) {
    const existing = JSON.parse(localStorage.getItem('fallbackData') || '[]');
    existing.push(data);
    localStorage.setItem('fallbackData', JSON.stringify(existing));
}

export function getDatabase() {
    return initializeFirebase();
}
