"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2 } from "lucide-react";

export function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Client-side validation for signup
      if (!isLogin) {
        if (!formData.displayName || formData.displayName.trim().length === 0) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
      }

      console.log("Starting login/signup with email:", formData.email);
      let data;
      if (isLogin) {
        console.log("Calling login...");
        data = await (await import("@/lib/api-client")).login(
          formData.email,
          formData.password
        );
      } else {
        console.log("Calling signup...");
        data = await (await import("@/lib/api-client")).signup(
          formData.email,
          formData.password,
          formData.displayName
        );
      }

      console.log("Auth response:", data);
      console.log("Token in localStorage after auth:", localStorage.getItem("auth_token"));
      
      // Success - reload page to trigger useEffect in page.tsx
      console.log("Reloading page...");
      window.location.href = "/";
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      console.error("Auth error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F172A]">
      <div className="absolute inset-0 mesh opacity-90" />
      
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-2xl border border-white/10 bg-[#1E293B] p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">NeuroCareer AI</h1>
            <p className="mt-2 text-sm text-gray-400">
              {isLogin ? "Welcome back" : "Create your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-white focus:border-[#6366F1] focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            {/* Display Name (Signup only) */}
            {!isLogin && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <User className="h-4 w-4" />
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-white focus:border-[#6366F1] focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-2 text-white focus:border-[#6366F1] focus:outline-none"
                placeholder={isLogin ? "••••••••" : "Min 8 characters"}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#6366F1] to-[#10B981] py-2 font-semibold text-white hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <p className="text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#6366F1] hover:text-[#10B981] font-semibold"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;
