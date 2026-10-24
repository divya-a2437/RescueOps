"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Leaf, LoaderCircle } from "lucide-react";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setIsSuccess(false);
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        if (password !== confirmPassword) {
          setMessage("Your passwords do not match.");
          return;
        }

        if (password.length < 8) {
          setMessage("Your password must be at least 8 characters long.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setIsSuccess(true);
        setMessage(
          "Account created! Check your email for a confirmation link if email verification is enabled. You can sign in once your account is confirmed."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage(
        mode === "signup"
          ? "Unable to create your account. Check your configuration and try again."
          : "Unable to sign in. Check your configuration and try again."
      );
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
          {mode === "signin" ? "Welcome back." : "Create your account."}
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#778077]">
          {mode === "signin"
            ? "Sign in to investigate incidents and manage evidence-backed actions."
            : "Join RescueOps to track incidents and manage evidence-backed actions."}
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
              className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-sm outline-none transition focus:border-[#618568] focus:ring-2 focus:ring-[#618568]/10"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-sm outline-none transition focus:border-[#618568] focus:ring-2 focus:ring-[#618568]/10"
              placeholder={
                mode === "signin"
                  ? "Your password"
                  : "At least 8 characters"
              }
            />
          </div>

          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-sm outline-none transition focus:border-[#618568] focus:ring-2 focus:ring-[#618568]/10"
                placeholder="Enter your password again"
              />
            </div>
          )}

          {message && (
            <p
              role={isSuccess ? "status" : "alert"}
              className={`rounded-xl p-3 text-sm leading-5 ${
                isSuccess
                  ? "bg-[#edf5ec] text-[#315f39]"
                  : "bg-[#fbefed] text-[#a44736]"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c4930] py-3.5 text-sm font-semibold text-white transition hover:bg-[#143a25] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <LoaderCircle size={17} className="animate-spin" />}
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#778077]">
            {mode === "signin"
              ? "New to RescueOps?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "signin" ? "signup" : "signin")
              }
              disabled={loading}
              className="font-semibold text-[#1c4930] underline-offset-4 transition hover:underline disabled:opacity-60"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-[#8a9388]">
          Secure workspace authentication · Accounts are managed through
          Supabase.
        </p>
      </div>
    </main>
  );
}