import {
  getFirestore,
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

function createDocumentId() {
  const timestamp = new Date().getTime().toString(36);
  const randomPart = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${timestamp}_${randomPart}`;
}

function isPermissionDeniedError(err) {
  return err?.code === "permission-denied" || (err?.message || "").includes("Missing or insufficient permissions");
}

export async function getDocument(collectionPath, id) {
  const snap = await getDoc(doc(db, collectionPath, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getDocuments(collectionPath, constraints = []) {
  const q = query(collection(db, collectionPath), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function insertDocument(collectionPath, data) {
  const docId = data.id || createDocumentId();
  const payload = { ...data, id: docId };
  delete payload.id;
  const ref = doc(db, collectionPath, docId);
  await setDoc(ref, { ...payload, created_at: serverTimestamp(), updated_at: serverTimestamp() });
  return { id: docId, ...payload };
}

export async function insertDocumentWithId(collectionPath, id, data) {
  const ref = doc(db, collectionPath, id);
  await setDoc(ref, { ...data, created_at: serverTimestamp(), updated_at: serverTimestamp() });
  return { id, ...data };
}

export async function updateDocument(collectionPath, id, data) {
  const clean = { ...data };
  delete clean.id;
  delete clean.created_at;
  const ref = doc(db, collectionPath, id);
  await updateDoc(ref, { ...clean, updated_at: serverTimestamp() });
  return { id, ...data };
}

export async function upsertDocument(collectionPath, id, data) {
  const ref = doc(db, collectionPath, id);
  let existing;
  try {
    existing = await getDoc(ref);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      return insertDocumentWithId(collectionPath, id, data);
    }
    throw err;
  }

  if (existing.exists()) {
    return updateDocument(collectionPath, id, data);
  }
  return insertDocumentWithId(collectionPath, id, data);
}

export async function deleteDocument(collectionPath, id) {
  await deleteDoc(doc(db, collectionPath, id));
  return { id };
}

export async function countDocuments(collectionPath, constraints = []) {
  const q = query(collection(db, collectionPath), ...constraints, limit(1));
  const snap = await getDocs(q);
  return snap.size;
}

export function subscribeToCollection(collectionPath, constraints, callback) {
  const q = query(collection(db, collectionPath), ...constraints);
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error(`[firebase] listen ${collectionPath}`, err)
  );
}

export function subscribeToDocument(collectionPath, id, callback) {
  return onSnapshot(
    doc(db, collectionPath, id),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => console.error(`[firebase] listen ${collectionPath}/${id}`, err)
  );
}

export { where, orderBy, limit, serverTimestamp };
