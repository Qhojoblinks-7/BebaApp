import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export function ref(collectionPath) {
  return collection(db, collectionPath);
}

export function docRef(collectionPath, id) {
  return doc(db, collectionPath, id);
}

export async function getDocument(collectionPath, id) {
  const snap = await getDoc(docRef(collectionPath, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getDocuments(collectionPath, constraints = []) {
  const q = query(ref(collectionPath), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function insertDocument(collectionPath, data) {
  const docId = data.id || crypto.randomUUID();
  const payload = { ...data, id: docId };
  delete payload.id;
  await setDoc(docRef(collectionPath, docId), {
    ...payload,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id: docId, ...payload };
}

export async function insertDocumentWithId(collectionPath, id, data) {
  await setDoc(docRef(collectionPath, id), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id, ...data };
}

export async function updateDocument(collectionPath, id, data) {
  const clean = { ...data };
  delete clean.id;
  delete clean.created_at;
  await updateDoc(docRef(collectionPath, id), {
    ...clean,
    updated_at: serverTimestamp(),
  });
  return { id, ...data };
}

export async function upsertDocument(collectionPath, id, data) {
  const existing = await getDoc(docRef(collectionPath, id));
  if (existing.exists()) {
    return updateDocument(collectionPath, id, data);
  }
  return insertDocumentWithId(collectionPath, id, data);
}

export async function deleteDocument(collectionPath, id) {
  await deleteDoc(docRef(collectionPath, id));
  return { id };
}

export async function countDocuments(collectionPath, constraints = []) {
  const q = query(ref(collectionPath), ...constraints, limit(1));
  const snap = await getDocs(q);
  return snap.size;
}

export function subscribeToCollection(collectionPath, constraints, callback) {
  const q = query(ref(collectionPath), ...constraints);
  const unsub = onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(rows);
    },
    (err) => console.error(`[firebase] listen ${collectionPath}`, err)
  );
  return unsub;
}

export function subscribeToDocument(collectionPath, id, callback) {
  const unsub = onSnapshot(
    docRef(collectionPath, id),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() });
    },
    (err) => console.error(`[firebase] listen ${collectionPath}/${id}`, err)
  );
  return unsub;
}

export { where, orderBy, limit, serverTimestamp };
