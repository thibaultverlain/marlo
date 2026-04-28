"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "/dashboard";
  const redirect = rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email ou mot de passe incorrect.");
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(redirect);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@maisonroselin.com"
          className="w-full px-4 py-3 text-[14px] bg-[#18181b] border border-[rgba(255,255,255,0.07)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
          Mot de passe
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 text-[14px] bg-[#18181b] border border-[rgba(255,255,255,0.07)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600"
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
      >
        {isPending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-block mb-4">
            <img src="/logo.svg" alt="Marlo" className="w-16 h-16 mx-auto" />
          </div>
          <h1
            className="text-2xl text-white"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.35em", fontWeight: 400 }}
          >
            MARLO
          </h1>
          <p className="text-zinc-500 text-sm mt-2">Connecte-toi pour accéder à ton espace</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-[11px] text-zinc-700">
          Marlo &mdash; Luxury Resell Management
        </p>
      </div>
    </div>
  );
}
