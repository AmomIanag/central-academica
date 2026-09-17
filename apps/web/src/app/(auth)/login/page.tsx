"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { ApiError, errorMessage } from "@/lib/api";
import { getCurrentUser, login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then(() => {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VALIDATION_ERROR") {
        setError("Informe um e-mail e uma senha válidos.");
      } else {
        setError(errorMessage(caught));
      }
      setSubmitting(false);
    }
  }

  if (checking) {
    return <Spinner className="h-5 w-5 text-muted" />;
  }

  return (
    <section className="w-full max-w-[380px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">FIAP</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Central Acadêmica</h1>
      <p className="mt-2 text-sm text-muted">Entre com seu e-mail institucional para ver notas e disciplinas.</p>

      <form
        onSubmit={onSubmit}
        className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-5"
      >
        <label className="block text-xs font-medium text-muted" htmlFor="email">
          E-mail
        </label>
        <Input
          id="email"
          className="mt-1.5"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className="mt-4 block text-xs font-medium text-muted" htmlFor="password">
          Senha
        </label>
        <Input
          id="password"
          className="mt-1.5"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-5 w-full" type="submit" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4" /> : null}
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </section>
  );
}
