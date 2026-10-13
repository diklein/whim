"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible } from "radix-ui";
import { ActivityIcon, ArchiveIcon, ChevronRightIcon, ComponentIcon, HandIcon, ImageIcon, LayoutTemplateIcon, PaletteIcon, Settings2Icon, TypeIcon } from "lucide-react";
import type { SubjectKind } from "@/db/schema";
import type { CaptureStatus, SidebarSubject } from "@/lib/types";
import { LogoMark } from "./logo";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "./ui/sidebar";
import { cn } from "@/lib/utils";

export const KIND_ICON: Record<SubjectKind, typeof ComponentIcon> = {
  component: ComponentIcon,
  pattern: LayoutTemplateIcon,
  text: TypeIcon,
  color: PaletteIcon,
  asset: ImageIcon,
};

type Group = { label: string; subjects: SidebarSubject[] };

/**
 * The sidebar on the shadcn sidebar-07 model, minus its collapsing: identity on top, grouped subjects with an icon
 * per kind, Shelved and Setup at the bottom. Always open on desktop; a sheet behind a Menu button on phones.
 */
export function AppSidebar({ project, capture, lastCapture, groups, passedCount }: { project: string; capture: CaptureStatus; lastCapture: string | null; groups: Group[]; passedCount: number }) {
  const path = usePathname();
  const isActive = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  // Nothing captured yet: no Live, no subjects, no footer. Just a welcome while Setup is finished.
  const fresh = groups.length === 0 && capture === "none";
  return (
    <Sidebar data-whim="whim-sidebar">
      <nav aria-label="Whim" className="flex min-h-0 flex-1 flex-col">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" data-whim="whim-logo">
                <span className="flex aspect-square size-9 items-center justify-center overflow-hidden rounded-lg border bg-white text-foreground shadow-[0_1px_2px_oklch(0_0_0/6%)]">
                  {/* The menu button sizes every descendant svg to 16px with a higher-specificity rule; the mark opts out. */}
                  <LogoMark className="size-6!" />
                </span>
                <span className="grid flex-1 self-center text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{project}</span>
                  {!fresh && <HookStatus status={capture} lastCapture={lastCapture} />}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {fresh ? (
          <Welcome />
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/", true)} className="pr-8">
                      <Link href="/"><ActivityIcon /><span>Live</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {groups.map((g) => (
              <SubjectGroup key={g.label} label={g.label} subjects={g.subjects} isActive={isActive} />
            ))}
          </>
        )}
      </SidebarContent>

      {!fresh && <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/shelved")} className="pr-8">
              <Link href="/shelved"><ArchiveIcon /><span>Shelved</span>{passedCount > 0 && <Count n={passedCount} unit="rejected" />}</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/setup")} className="pr-8">
              <Link href="/setup"><Settings2Icon /><span>Setup</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>}
      </nav>
    </Sidebar>
  );
}

/** The sidebar before anything is captured: a wave, a welcome, and one line about what comes next. */
function Welcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" data-whim="whim-sidebar-welcome">
      <span className="grid size-12 place-items-center rounded-full bg-sidebar-accent text-foreground" aria-hidden="true">
        <HandIcon className="wave size-6" />
      </span>
      <p className="text-sm font-semibold">Welcome to Whim</p>
      <p className="text-xs text-muted-foreground text-pretty">Your changes will be categorized and tracked. Finish setup to get started.</p>
    </div>
  );
}

/** One section per kind. The label folds the section; the choice is remembered per section. */
function SubjectGroup({ label, subjects, isActive }: { label: string; subjects: SidebarSubject[]; isActive: (href: string) => boolean }) {
  const id = `section:${label.toLowerCase()}`;
  const open = useRemembered(id);
  return (
    <Collapsible.Root open={open} onOpenChange={(o) => remember(id, o)} className="group/section">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <Collapsible.Trigger className="pr-1.5 hover:text-sidebar-foreground">
            {label}
            <ChevronRightIcon className="ml-auto transition-transform duration-150 group-data-[state=open]/section:rotate-90 motion-reduce:transition-none" />
          </Collapsible.Trigger>
        </SidebarGroupLabel>
        <Collapsible.Content>
          <SidebarGroupContent>
            <SidebarMenu>
              {subjects.map((s) => (
                <SubjectItem key={s.id} s={s} isActive={isActive} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </Collapsible.Content>
      </SidebarGroup>
    </Collapsible.Root>
  );
}

/**
 * A subject with its icon by kind. Every row reserves a chevron column on the right, so counts line up whether or
 * not a row has parts. A parent's chevron folds its parts, remembered per subject; the name still navigates.
 */
function SubjectItem({ s, isActive }: { s: SidebarSubject; isActive: (href: string) => boolean }) {
  const Icon = KIND_ICON[s.kind];
  const href = `/subjects/${s.slug}`;
  const id = `subject:${s.slug}`;
  const open = useRemembered(id);
  const children = [...s.children].sort((a, b) => b.lastChangedAt.getTime() - a.lastChangedAt.getTime());
  const button = (
    <SidebarMenuButton asChild isActive={isActive(href)} className="pr-8">
      <Link href={href}><Icon /><span className="min-w-0 truncate">{s.name}</span>{s.changeCount > 0 && <Count n={s.changeCount} />}</Link>
    </SidebarMenuButton>
  );
  if (!children.length) return <SidebarMenuItem>{button}</SidebarMenuItem>;
  return (
    <Collapsible.Root open={open} onOpenChange={(o) => remember(id, o)} asChild className="group/item">
      <SidebarMenuItem>
        {button}
        <Collapsible.Trigger asChild>
          <SidebarMenuAction showOnHover={false} className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <ChevronRightIcon className="transition-transform duration-150 group-data-[state=open]/item:rotate-90 motion-reduce:transition-none" />
            <span className="sr-only">{open ? "Hide" : "Show"} the parts of {s.name}</span>
          </SidebarMenuAction>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub className="mr-0 pr-0">
            {children.map((c) => {
              const CIcon = KIND_ICON[c.kind];
              const chref = `/subjects/${c.slug}`;
              return (
                <SidebarMenuSubItem key={c.id}>
                  <SidebarMenuSubButton asChild isActive={isActive(chref)} className="pr-8">
                    <Link href={chref}><CIcon /><span className="min-w-0 truncate">{c.name}</span>{c.changeCount > 0 && <Count n={c.changeCount} />}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}

/** A count at the row's edge. Sighted users see the number; the row's name says what it counts. */
function Count({ n, unit = "versions" }: { n: number; unit?: string }) {
  const label = unit === "versions" && n === 1 ? "1 version" : `${n} ${unit}`;
  return (
    <>
      <span aria-hidden="true" className="ml-auto shrink-0 pl-1 text-xs text-muted-foreground tabular-nums">{n}</span>
      <span className="sr-only">, {label}</span>
    </>
  );
}

/**
 * Hook status under the project name, limited to what the server knows: red until the first capture arrives, a looping
 * shimmer while a turn is being captured or written up, and otherwise when the last capture landed. Whim cannot see the
 * hook itself, so it never claims to be connected.
 */
function HookStatus({ status, lastCapture }: { status: CaptureStatus; lastCapture: string | null }) {
  const label = status === "capturing" ? "Capturing…" : status === "idle" ? `Last capture ${lastCapture ?? "unknown"}` : "Not connected";
  return (
    <span data-whim="whim-hook-status" role="status" className={cn("w-fit max-w-full truncate text-xs", status === "none" ? "font-medium text-destructive" : "text-muted-foreground", status === "capturing" && "text-shimmer")}>
      {label}
    </span>
  );
}

// Open state per section and per parent subject, remembered in localStorage. Everything starts open; the server renders it open.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};
const key = (id: string) => `whim:sidebar:${id}`;
function useRemembered(id: string) {
  return useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key(id)) !== "closed"; } catch { return true; } }, () => true);
}
function remember(id: string, open: boolean) {
  try { localStorage.setItem(key(id), open ? "open" : "closed"); } catch {}
  listeners.forEach((l) => l());
}
