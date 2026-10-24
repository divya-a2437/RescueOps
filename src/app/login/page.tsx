
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Leaf, LoaderCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Unable to sign in. Check your configuration and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-5 py-12 text-[#202b24]">
      <div className="w-full max-w-md rounded-3xl border border-[#e5e9e2] bg-white p-8 shadow-sm sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173e2b] text-white">
          <Leaf size={24} />
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-[#66806a]">
          RescueOps workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Welcome back.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#778077]">
          Sign in to investigate incidents and manage evidence-backed actions.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-sm outline-none focus:border-[#618568]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-sm outline-none focus:border-[#618568]"
              placeholder="Your password"
            />
          </div>

          {message && (
            <p role="alert" className="rounded-xl bg-[#fbefed] p-3 text-sm text-[#a44736]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c4930] py-3.5 text-sm font-semibold text-white transition hover:bg-[#143a25] disabled:opacity-60"
          >
            {loading && <LoaderCircle size={17} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-[#8a9388]">
          Demo workspace authentication · Accounts are managed through Supabase.
        </p>
      </div>
    </main>
  );
}
