"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polling, not websockets: refresh server data every few seconds while the tab is visible. */
export function Poller({ every = 4000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    let id: number | undefined;
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const start = () => { stop(); id = window.setInterval(tick, every); };
    const stop = () => { if (id) window.clearInterval(id); };
    const onVis = () => (document.visibilityState === "visible" ? (tick(), start()) : stop());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [router, every]);
  return null;
}
