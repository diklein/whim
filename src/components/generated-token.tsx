"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Input } from "./ui/input";
import { CopyButton } from "./copy-button";

// One token per browser, made on first visit and kept in localStorage, so polling and reloads never change it.
const KEY = "whim:setup-token";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const read = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };
const make = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

function useGeneratedToken() {
  const token = useSyncExternalStore(subscribe, read, () => "");
  useEffect(() => {
    if (read()) return;
    try { localStorage.setItem(KEY, make()); } catch {}
    listeners.forEach((l) => l());
  }, []);
  return token;
}

/** A read-only field with the generated token, as the bare value or as a `WHIM_TOKEN=` line, with Copy. */
export function GeneratedTokenField({ as, label }: { as: "value" | "line"; label: string }) {
  const token = useGeneratedToken();
  const value = token ? (as === "line" ? `WHIM_TOKEN=${token}` : token) : "";
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Input readOnly value={value} name="whim-token" autoComplete="off" spellCheck={false} placeholder="Generating…" aria-label={label} className="min-w-48 flex-1 bg-white font-mono text-xs" />
      <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} announce="Copied" size="default" variant="default" disabled={!value}>Copy</CopyButton>
    </div>
  );
}
