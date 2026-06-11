import { useEffect, useRef, useCallback } from "react";
import notificationService from "../services/notificationService";

const NEW_ORDER_DEEP_LINK = "JobQueueTab";
let hasProcessedInitialResponse = false;

export function useNotifications(onDeepLink) {
  const receivedSub = useRef(null);
  const responseSub = useRef(null);

  const handleNotificationNavigate = useCallback(
    (notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === "string") {
        onDeepLink?.(url);
      }
    },
    [onDeepLink]
  );

  useEffect(() => {
    notificationService.setupHandler();

    // Only process initial notification response once to prevent loops
    if (!hasProcessedInitialResponse) {
      const response = notificationService.getLastNotificationResponse();
      if (response?.notification) {
        const url = response.notification.request.content.data?.url;
        if (typeof url === "string") {
          onDeepLink?.(url);
        }
      }
      hasProcessedInitialResponse = true;
    }

    receivedSub.current = notificationService.addListenerReceived((notification) => {
      console.log("[useNotifications] Foreground:", notification.request.content.title);
    });

    responseSub.current = notificationService.addListenerResponse((response) => {
      console.log("[useNotifications] Tapped:", response.notification.request.content.title);
      handleNotificationNavigate(response.notification);
    });

    return () => {
      notificationService.removeListener(receivedSub.current);
      notificationService.removeListener(responseSub.current);
      hasProcessedInitialResponse = false;
    };
  }, [handleNotificationNavigate, onDeepLink]);

  const scheduleNewOrderNotification = useCallback((order) => {
    notificationService.scheduleLocalNotification({
      title: "New Order Available",
      body: `Order #${order.order_id || order.id} is ready for pickup`,
      data: { url: NEW_ORDER_DEEP_LINK, orderId: order.id },
    });
  }, []);

  return {
    scheduleNewOrderNotification,
  };
}

export function useNotificationBadge() {
  const count = useRef(0);

  const increment = useCallback(async () => {
    count.current += 1;
    await notificationService.setBadgeCount(count.current);
  }, []);

  const clear = useCallback(async () => {
    count.current = 0;
    await notificationService.setBadgeCount(0);
    await notificationService.dismissAllNotifications();
  }, []);

  return { incrementBadge: increment, clearBadge: clear };
}
