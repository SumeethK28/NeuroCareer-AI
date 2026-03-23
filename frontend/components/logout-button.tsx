"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log("Starting logout...");
      
      // Clear the token from localStorage
      logout();
      
      console.log("Token cleared, redirecting to auth page");
      
      // Redirect to auth page
      router.push("/?view=auth");
      
      // Force a page reload to clear all state
      setTimeout(() => {
        window.location.href = "/?view=auth";
      }, 500);
    } catch (err) {
      console.error("Logout error:", err);
      // Still redirect even if there's an error
      router.push("/?view=auth");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-300 transition-colors"
      title="Logout from NeuroCareer"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}
