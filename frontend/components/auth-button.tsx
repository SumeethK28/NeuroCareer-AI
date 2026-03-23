"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/api-client";

type Props = {
  authenticated: boolean;
};

export function AuthButton({ authenticated }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/?view=auth");
  };

  const handleLogin = () => {
    router.push("/?view=auth");
  };

  return authenticated ? (
    <button
      onClick={handleLogout}
      className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900 transition-colors"
    >
      Sign out
    </button>
  ) : (
    <button
      onClick={handleLogin}
      className="gradient-border px-4 py-2 text-sm font-medium text-slate-50 hover:opacity-90 transition-opacity"
    >
      Sign in
    </button>
  );
}
