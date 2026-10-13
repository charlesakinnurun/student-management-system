"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NAV } from "@/components/layout/nav-config";
import type { UserRole } from "@/lib/domain/enums";

export interface AppShellProps {
  session: { name: string; email: string; role: UserRole };
  appName: string;
  children: ReactNode;
}

/** Authenticated application chrome: sidebar + topbar + content. */
export function AppShell({ session, appName, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full">
        <Sidebar
          items={NAV[session.role]}
          appName={appName}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={session.name}
            email={session.email}
            role={session.role}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
          />
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
