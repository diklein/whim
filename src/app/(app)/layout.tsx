import { Suspense } from "react";
import { Sidebar, SidebarSkeleton } from "@/components/sidebar";
import { Logo } from "@/components/logo";
import { MenuButton } from "@/components/menu-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <SidebarInset id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* Phones only: the sidebar lives in a sheet behind this button. On wider screens it is always open. */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 md:hidden">
          <Logo />
          <MenuButton />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
