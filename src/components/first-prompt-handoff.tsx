"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const KEY = "whim:awaiting-first-prompt";

/** Rendered on Setup while nothing has been captured: remembers that this person is waiting. */
export function AwaitingFirstPrompt() {
  useEffect(() => { try { sessionStorage.setItem(KEY, "1"); } catch {} }, []);
  return null;
}

/** Rendered on Setup once something has been captured: if they were waiting here, take them to the result. */
export function FirstPromptArrived() {
  const router = useRouter();
  useEffect(() => {
    let waiting = false;
    try { waiting = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch {}
    if (waiting) router.replace("/");
  }, [router]);
  return null;
}
