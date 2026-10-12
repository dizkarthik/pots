"use server";

import { redirect } from "next/navigation";
import { endSession, passwordMatches, startSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = { error?: string };

function safeNext(next: unknown): string {
  // Only allow same-origin relative paths.
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!passwordMatches(parsed.data.password)) return { error: "Incorrect password" };
  await startSession();
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
