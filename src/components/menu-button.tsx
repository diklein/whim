"use client";

import { useEffect, useRef } from "react";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";

/**
 * The phone-only menu button. The sidebar sheet is controlled by the provider rather than a Radix trigger, so
 * Radix cannot restore focus on close; this does it, so Escape lands back here instead of on the page body.
 */
export function MenuButton() {
  const { openMobile } = useSidebar();
  const ref = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const closing = wasOpen.current && !openMobile;
    wasOpen.current = openMobile;
    if (!closing) return;
    // The sheet animates out before it unmounts, so wait until it is gone, then take focus if nothing has it.
    let id = 0;
    const deadline = performance.now() + 1500;
    const check = () => {
      if (document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]') && performance.now() < deadline) { id = requestAnimationFrame(check); return; }
      if (!document.activeElement || document.activeElement === document.body) ref.current?.focus();
    };
    id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [openMobile]);
  return <SidebarTrigger ref={ref} aria-label="Open menu" aria-expanded={openMobile} />;
}
