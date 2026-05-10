import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported() {
  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

async function getActiveRegistration(
  timeout = 3000,
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  try {
    const result = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout)),
    ]);
    return result;
  } catch {
    return null;
  }
}

export function usePushNotification() {
  const { user, status } = useAuth();
  const [isSupported] = useState(isPushSupported);
  const [swReady, setSwReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    () => (isPushSupported() ? Notification.permission : null),
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    getActiveRegistration().then((reg) => setSwReady(!!reg));
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || !swReady) {
      setIsSubscribed(false);
      return;
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      logger.error("Failed to check push subscription:", error);
      return;
    }

    setIsSubscribed(!!data);
  }, [user, swReady]);

  useEffect(() => {
    if (status === "authenticated" || status === "anonymous") {
      checkSubscriptionStatus();
    } else {
      setIsSubscribed(false);
    }
  }, [status, swReady, checkSubscriptionStatus]);

  const subscribe = useCallback(async () => {
    if (!user || !swReady) return;

    setIsSubscribing(true);
    try {
      let currentPermission = Notification.permission;
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== "granted") {
        throw new Error("Permission denied");
      }

      const registration = await getActiveRegistration();
      if (!registration) {
        throw new Error("Service worker not available");
      }

      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key not configured");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      });

      const subJSON = subscription.toJSON();
      const endpoint = subJSON.endpoint;
      const keys = subJSON.keys;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Invalid push subscription");
      }

      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        logger.error("Failed to clear old push subscription:", deleteError);
      }

      const { error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        });

      if (insertError) throw insertError;

      setIsSubscribed(true);
    } catch (error) {
      logger.error("Failed to subscribe to push:", error);
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  }, [user, swReady]);

  const unsubscribe = useCallback(async () => {
    if (!user || !swReady) return;

    setIsUnsubscribing(true);
    try {
      const registration = await getActiveRegistration();
      if (registration) {
        const existingSubscription =
          await registration.pushManager.getSubscription();
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
        }
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsSubscribed(false);
    } catch (error) {
      logger.error("Failed to unsubscribe from push:", error);
      throw error;
    } finally {
      setIsUnsubscribing(false);
    }
  }, [user, swReady]);

  return {
    isSupported,
    swReady,
    permission,
    isSubscribed,
    isSubscribing,
    isUnsubscribing,
    subscribe,
    unsubscribe,
  } as const;
}
