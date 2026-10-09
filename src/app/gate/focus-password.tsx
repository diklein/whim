"use client";

import { useEffect } from "react";

/**
 * Puts the caret in the password field as soon as the form is on screen. The HTML `autofocus` attribute
 * fires once per page load, and the form streams in after the fallback, so it was being missed.
 */
export function FocusPassword({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement && document.activeElement !== el) el.focus();
  }, [id]);
  return null;
}
