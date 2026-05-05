"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className="flex items-center gap-2.5 w-full px-2.5 py-[9px] lg:py-[7px] rounded-md text-[13px] text-[var(--color-text-muted)] hover:text-red-400 hover:bg-[var(--color-bg-hover)] transition-all duration-100"
    >
      <LogOut size={16} strokeWidth={1.5} />
      <span>{isPending ? "..." : "Déconnexion"}</span>
    </button>
  );
}
