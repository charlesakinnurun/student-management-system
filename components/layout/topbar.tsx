"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Humanize } from "@/components/ui/humanize";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export interface TopbarProps {
  name: string;
  email: string;
  role: string;
  onToggleSidebar: () => void;
}

export function Topbar({ name, email, role, onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await api.post("/api/auth/logout");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          <Icon name="menu" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium leading-tight">{name}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">{email}</p>
        </div>
        <Badge tone="primary">
          <Humanize value={role} />
        </Badge>
        <Button variant="outline" size="sm" onClick={handleLogout} loading={signingOut}>
          <Icon name="logout" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
