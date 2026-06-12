import { Platform } from "react-native";
import {
  onSnapshot,
  collection,
  query,
  where,
  limit,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { db } from "./firebaseConfig";

const CHANNEL_ID = "new-orders";

function setupHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldSetBadge: true,
      shouldPlaySound: true,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "New Order Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#115e59",
      enableVibration: true,
    });
  } catch (err) {
    console.warn(
      "[NotificationService] Channel registration failed:",
      err.message,
    );
  }
}

async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  return final;
}

function listenForNewOrders(onNewOrder) {
  const q = query(
    collection(db, "orders"),
    where("status", "==", "pending"),
    orderBy("created_at", "asc"),
    limit(50),
  );

  return onSnapshot(
    q,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const changes = snap.docChanges();
      changes.forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          onNewOrder?.({
            orderId: change.doc.id,
            orderIdDisplay: data.order_id || change.doc.id,
          });
        }
      });
    },
    (err) => {
      const msg = err.message || String(err);
      if (msg.includes("Missing or insufficient permissions")) {
        console.error(
          "[NotificationService] Permissions error. Check Firestore rules for orders collection:",
          "https://firebase.google.com/docs/firestore/security/get-started",
        );
      } else {
        console.error(
          "[NotificationService] New orders listener failed:",
          msg,
        );
      }
      if (msg.includes("index")) {
        console.error(
          "[NotificationService] REQUIRES INDEX: Add composite index on orders collection with fields: status ASC, created_at ASC",
        );
      }
    },
  );
}

async function scheduleLocalNotification(content, trigger = null) {
  await Notifications.scheduleNotificationAsync({
    content: {
      sound: "cash_register.mp3",
      ...content,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    },
    trigger,
  });
}

async function createFirestoreNotification({
  riderId,
  title,
  body,
  orderId,
  orderIdDisplay,
  type = "info",
}) {
  if (!riderId) return;
  try {
    const ref = doc(collection(db, "notifications"));
    await setDoc(ref, {
      rider_id: riderId,
      title,
      body,
      order_id: orderIdDisplay || orderId,
      type,
      is_read: false,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn(
      "[NotificationService] Firestore notification write failed:",
      err.message,
    );
  }
}

function addListenerReceived(onReceived) {
  return Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });
}

function addListenerResponse(onResponse) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse?.(response);
  });
}

function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponse();
}

function removeListener(unsubscribe) {
  if (typeof unsubscribe === "function") {
    unsubscribe();
  } else if (unsubscribe?.remove) {
    unsubscribe.remove();
  }
}

async function dismissAllNotifications() {
  try {
    await Notifications.dismissAllPresentedNotificationsAsync();
  } catch (err) {
    console.warn(
      "[NotificationService] Dismiss all notifications failed:",
      err.message,
    );
  }
}

async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (err) {
    console.warn("[NotificationService] Set badge count failed:", err.message);
  }
}

async function getBadgeCount() {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (err) {
    console.warn("[NotificationService] Get badge count failed:", err.message);
    return 0;
  }
}

async function registerPushToken(riderId) {
  if (!riderId) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("[NotificationService] Push permission not granted");
      return null;
    }

    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    if (!expoPushToken) return null;

    await setDoc(
      doc(db, "rider_push_tokens", riderId),
      {
        rider_id: riderId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
    return expoPushToken;
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("FirebaseApp") || msg.includes("FCM") || msg.includes("fcm-credentials")) {
      console.warn("[NotificationService] FCM setup required. Place google-services.json in android/app/ and upload FCM credentials to Expo:", "https://docs.expo.dev/push-notifications/fcm-credentials/");
    } else {
      console.warn("[NotificationService] Push token registration failed:", msg);
    }
    return null;
  }
}

async function getAllRiderPushTokens() {
  try {
    const snap = await getDocs(collection(db, "rider_push_tokens"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[NotificationService] Fetch rider push tokens failed:", err.message);
    return [];
  }
}

export default {
  setupHandler,
  ensureChannel,
  requestPermissions,
  scheduleLocalNotification,
  createFirestoreNotification,
  addListenerReceived,
  addListenerResponse,
  getLastNotificationResponse,
  removeListener,
  dismissAllNotifications,
  setBadgeCount,
  getBadgeCount,
  CHANNEL_ID,
  listenForNewOrders,
  registerPushToken,
  getAllRiderPushTokens,
};
