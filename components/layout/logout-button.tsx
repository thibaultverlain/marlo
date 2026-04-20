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
      className="flex items-center gap-2.5 w-full px-2.5 py-[9px] lg:py-[7px] rounded-md text-[13px] text-zinc-600 hover:text-red-400 hover:bg-white/[0.04] transition-all duration-100"
    >
      <LogOut size={16} strokeWidth={1.5} />
      <span>{isPending ? "..." : "Déconnexion"}</span>
    </button>
  );
}
