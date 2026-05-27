import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const PUSH_SUBSCRIPTIONS_TABLE = "push_subscriptions";
const PUSH_DEVICE_ID_KEY = "my-tasks-push-device-id";
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function getPushDeviceId() {
  let deviceId = localStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(PUSH_DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function subscriptionToRow(subscription) {
  const subscriptionJson = subscription.toJSON();

  return {
    device_id: getPushDeviceId(),
    endpoint: subscriptionJson.endpoint,
    p256dh: subscriptionJson.keys?.p256dh,
    auth: subscriptionJson.keys?.auth,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  };
}

export function canUseBackgroundPushNotifications() {
  return Boolean(
    isSupabaseConfigured &&
      vapidPublicKey &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );
}

export function isBackgroundPushConfigured() {
  return Boolean(vapidPublicKey);
}

export async function getCurrentPushEndpoint() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription?.endpoint || null;
}

export async function subscribeToTaskPushNotifications() {
  if (!canUseBackgroundPushNotifications()) {
    return { ok: false, reason: vapidPublicKey ? "unsupported" : "missing-key" };
  }

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();

  if (permission !== "granted") {
    return { ok: false, reason: permission };
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const { error } = await supabase
    .from(PUSH_SUBSCRIPTIONS_TABLE)
    .upsert(subscriptionToRow(subscription), { onConflict: "endpoint" });

  if (error) {
    throw error;
  }

  return { ok: true, endpoint: subscription.endpoint };
}

export async function sendTaskPushNotification(task, notificationType, originEndpoint) {
  if (!isSupabaseConfigured || !task?.id) {
    return;
  }

  const { error } = await supabase.functions.invoke("notify-task-change", {
    body: {
      type: notificationType,
      task: {
        id: task.id,
        title: task.title,
      },
      originEndpoint,
    },
  });

  if (error) {
    throw error;
  }
}
