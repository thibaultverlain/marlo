"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState<"default" | "granted" | "denied">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  async function handleToggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Les notifications push ne sont pas supportées par ce navigateur.");
      return;
    }

    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unsubscribe", subscription: sub.toJSON() }),
          });
        }
        setSubscribed(false);
      } else {
        // Request permission
        const perm = await Notification.requestPermission();
        setPermission(perm);

        if (perm !== "granted") {
          setLoading(false);
          return;
        }

        // Subscribe
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.error("VAPID public key not configured");
          setLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON() }),
        });

        setSubscribed(true);
      }
    } catch (err) {
      console.error("Push toggle error:", err);
    }

    setLoading(false);
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <BellOff size={16} className="text-red-400" />
        <div>
          <p className="text-sm text-red-300">Notifications bloquées</p>
          <p className="text-[11px] text-red-400/60">Active-les dans les paramètres de ton navigateur.</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
        subscribed
          ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/15"
          : "bg-[var(--color-bg-raised)] border border-[var(--color-border)] text-zinc-400 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)]"
      }`}
    >
      {subscribed ? <Bell size={16} className="text-indigo-400" /> : <BellOff size={16} />}
      <span className="flex-1 text-left">
        {loading ? "..." : subscribed ? "Notifications activées" : "Activer les notifications"}
      </span>
      {subscribed && (
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
      )}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}
