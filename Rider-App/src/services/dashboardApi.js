import { 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  limit, 
  collection 
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

// 🔑 FIXED: Removed the import of notificationStore to break the circular loop!

function riderStatusRef(userId) {
  return doc(db, "rider_status", userId);
}
function ordersCollection() {
  return collection(db, "orders");
}
function notificationsCollection() {
  return collection(db, "notifications");
}
function revenueCollection() {
  return collection(db, "revenue");
}

export async function fetchCurrentStatus(userId) {
  if (!userId) return null;
  const snap = await getDoc(riderStatusRef(userId));
  if (!snap.exists()) return "offline";
  return snap.data().rider_status || "offline";
}

export async function fetchProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function fetchUnreadCount(userId) {
  if (!userId) return 0;
  const q = query(
    notificationsCollection(), 
    where("rider_id", "==", userId), 
    where("is_read", "==", false), 
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function updateStatus(userId, status) {
  await updateDoc(riderStatusRef(userId), {
    rider_status: status,
    updated_at: serverTimestamp(),
  });
}

export function subscribeDashboardNotifications(userId, callback) {
  if (!userId) return () => {};
  return onSnapshot(
    query(
      notificationsCollection(), 
      where("rider_id", "==", userId), 
      orderBy("created_at", "desc"), 
      limit(100)
    ),
    (snap) => {
      const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(notifications);
    },
    (err) => console.error("[firebase] dashboard notifications listen", err)
  );
}