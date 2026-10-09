"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

/** Copies text and confirms with a checkmark and an aria-live announcement. */
export function CopyButton({ text, label, announce, size = "sm", variant = "ghost", icon, disabled, className, whim, children }: {
  text: string;
  label: string;
  announce?: string;
  size?: "xs" | "sm" | "default";
  variant?: "ghost" | "outline" | "secondary" | "default";
  disabled?: boolean;
  /** Replaces the default copy icon at rest. The checkmark still confirms the copy. */
  icon?: React.ReactNode;
  /** A data-whim slug, so this button is tracked as its own subject. */
  whim?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setMsg(announce ?? `${label} copied`);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { setDone(false); setMsg(""); }, 1600);
    } catch {
      setMsg("Copy failed. Select the text and copy it by hand.");
    }
  }
  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={copy} disabled={disabled} aria-label={done ? `${label} copied` : label} className={cn(className)} data-whim={whim}>
        {done ? <CheckIcon className="text-picked" aria-hidden="true" /> : (icon ?? <CopyIcon aria-hidden="true" />)}
        {children}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">{msg}</span>
    </>
  );
}
