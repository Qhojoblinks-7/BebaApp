import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const WALLET_COLLECTION = "wallets";
const PAYOUT_COLLECTION = "payouts";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchWalletSummary(riderId) {
  if (!riderId) return null;

  const revenueQuery = query(
    collection(db, "revenue"),
    where("rider_id", "==", riderId)
  );
  const revenueSnap = await getDocs(revenueQuery);
  const totalRevenue = revenueSnap.docs.reduce((sum, doc) => sum + toNumber(doc.data().amount), 0);

  const payoutQuery = query(
    collection(db, PAYOUT_COLLECTION),
    where("rider_id", "==", riderId)
  );
  const payoutSnap = await getDocs(payoutQuery);
  const completedPayouts = payoutSnap.docs.filter((doc) => doc.data().status === "completed");
  const totalPaidOut = completedPayouts.reduce((sum, doc) => sum + toNumber(doc.data().amount), 0);

  const walletRef = doc(db, WALLET_COLLECTION, riderId);
  const walletSnap = await getDoc(walletRef);
  const walletData = walletSnap.exists() ? walletSnap.data() : null;

  const availableBalance = Math.max(totalRevenue - totalPaidOut, 0);

  return {
    riderId,
    totalRevenue,
    totalPaidOut,
    availableBalance,
    pendingPayouts: payoutSnap.docs
      .filter((doc) => doc.data().status === "pending")
      .map((doc) => ({ id: doc.id, ...doc.data() })),
    lastSyncedAt: walletData?.lastSyncedAt || null,
  };
}

export async function requestPayout(riderId, amount) {
  if (!riderId || amount <= 0) {
    throw new Error("Invalid payout request");
  }

  const summary = await fetchWalletSummary(riderId);
  if (amount > summary.availableBalance) {
    throw new Error("Insufficient available balance");
  }

  const payoutRef = doc(collection(db, PAYOUT_COLLECTION));
  await setDoc(payoutRef, {
    rider_id: riderId,
    amount,
    status: "pending",
    requested_at: serverTimestamp(),
    processed_at: null,
    note: "Queued for ops approval",
  });

  await updateWalletRecord(riderId, summary);
  return payoutRef.id;
}

export async function fetchPayoutHistory(riderId, limitCount = 20) {
  if (!riderId) return [];

  const payoutQuery = query(
    collection(db, PAYOUT_COLLECTION),
    where("rider_id", "==", riderId),
    orderBy("requested_at", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(payoutQuery);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function updateWalletRecord(riderId, summary) {
  const walletRef = doc(db, WALLET_COLLECTION, riderId);
  await setDoc(walletRef, {
    rider_id: riderId,
    totalRevenue: summary.totalRevenue,
    totalPaidOut: summary.totalPaidOut,
    availableBalance: summary.availableBalance,
    pendingPayouts: summary.pendingPayouts,
    lastSyncedAt: serverTimestamp(),
  });
}

export async function approvePayout(payoutId) {
  const payoutRef = doc(db, PAYOUT_COLLECTION, payoutId);
  const snapshot = await getDoc(payoutRef);
  if (!snapshot.exists()) throw new Error("Payout record not found");

  await updateDoc(payoutRef, {
    status: "completed",
    processed_at: serverTimestamp(),
    note: "Approved by operations",
  });
}

export async function rejectPayout(payoutId) {
  const payoutRef = doc(db, PAYOUT_COLLECTION, payoutId);
  const snapshot = await getDoc(payoutRef);
  if (!snapshot.exists()) throw new Error("Payout record not found");

  await updateDoc(payoutRef, {
    status: "rejected",
    processed_at: serverTimestamp(),
    note: "Rejected by operations",
  });
}
