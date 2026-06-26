"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaControls() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [status, setStatus] = useState("Ready for offline punch capture");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setStatus("Connection restored");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("Offline mode active");
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setStatus("Install prompt not available yet");
      return;
    }

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setStatus(result.outcome === "accepted" ? "App installed" : "Install dismissed");
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      setStatus("Notifications are not supported here");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setStatus("Push notifications enabled");
    } else {
      setStatus("Notifications blocked");
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-[0_0_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Mobile PWA</div>
          <div className="mt-1 text-sm font-semibold text-white">Installable shell and push alerts</div>
          <div className="mt-1 text-[11px] text-zinc-500">{status}</div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isOnline
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/25 bg-amber-500/10 text-amber-400"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Install App
        </button>
        <button
          onClick={handleEnableNotifications}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-zinc-200 transition-colors hover:bg-white/[0.05]"
        >
          Enable Push
        </button>
      </div>
    </div>
  );
}
