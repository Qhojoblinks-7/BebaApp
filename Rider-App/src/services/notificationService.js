import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const CHANNEL_ID = "new-orders";

function setupHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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
    console.warn("[NotificationService] Channel registration failed:", err.message);
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

async function scheduleLocalNotification(content, trigger = null) {
  await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    },
    trigger,
  });
}

function addListenerReceived(onReceived) {
  return Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });
}

function addListenerResponse(onResponse) {
  return Notifications.addNotificationResponseReceivedListener(onResponse);
}

function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponse();
}

function removeListener(subscription) {
  if (subscription?.remove) subscription.remove();
}

async function dismissAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

export default {
  setupHandler,
  ensureChannel,
  requestPermissions,
  scheduleLocalNotification,
  addListenerReceived,
  addListenerResponse,
  getLastNotificationResponse,
  removeListener,
  dismissAllNotifications,
  setBadgeCount,
  getBadgeCount,
  CHANNEL_ID,
};
