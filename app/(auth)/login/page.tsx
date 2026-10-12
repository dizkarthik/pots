import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Pots" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-title-3-semibold text-text-primary">Pots</h1>
          <p className="text-body-regular text-text-secondary">Sign in to your budget.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
