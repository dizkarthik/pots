"use client";

import { useActionState } from "react";
import { RiLockPasswordLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { login, type LoginState } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <Input
        name="password"
        type="password"
        label="Password"
        autoFocus
        isRequired
        // Server errors are shown via ARIA only; "native" would set a custom
        // validity and block the browser from resubmitting the form.
        validationBehavior="aria"
        autoComplete="current-password"
        leadingIcon={RiLockPasswordLine}
        isInvalid={Boolean(state.error)}
        hint={state.error}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
