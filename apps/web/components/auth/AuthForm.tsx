"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  login,
  requestPasswordReset,
  signup,
  type AuthActionState,
} from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup" | "forgot-password";

const initialState: AuthActionState = {};

const content = {
  login: {
    title: "Welcome back",
    description: "Sign in to continue building your repertoire.",
    submit: "Sign in",
    alternate: "New to Chessloom?",
    alternateAction: "Create an account",
    alternateHref: "/signup",
  },
  signup: {
    title: "Create your account",
    description: "Start turning opening knowledge into instinct.",
    submit: "Create account",
    alternate: "Already have an account?",
    alternateAction: "Sign in",
    alternateHref: "/login",
  },
  "forgot-password": {
    title: "Reset your password",
    description: "We will email you a secure link to get back in.",
    submit: "Send reset link",
    alternate: "Remembered your password?",
    alternateAction: "Back to sign in",
    alternateHref: "/login",
  },
} satisfies Record<
  AuthMode,
  {
    title: string;
    description: string;
    submit: string;
    alternate: string;
    alternateAction: string;
    alternateHref: string;
  }
>;

const actions = {
  login,
  signup,
  "forgot-password": requestPasswordReset,
};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}

function ActionFeedback({ state }: { state: AuthActionState }) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success(state.success);
    }
  }, [state]);

  return state.error ? <FieldError>{state.error}</FieldError> : null;
}

function GoogleButton() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();
  const starter = searchParams.get("starter");

  async function handleGoogleSignIn() {
    setPending(true);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    const next = starter
      ? `/dashboard?starter=${encodeURIComponent(starter)}`
      : "/dashboard";
    callbackUrl.searchParams.set("next", next);
    callbackUrl.searchParams.set("event", "oauth");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      toast.error(error.message);
      setPending(false);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
    } else {
      toast.error("Google sign-in could not be started.");
      setPending(false);
    }
  }

  return (
    <FieldGroup>
      <Button
        className="w-full"
        disabled={pending}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        <LogIn aria-hidden="true" />
        Continue with Google
      </Button>
    </FieldGroup>
  );
}

function AuthFormInner({ mode }: { mode: AuthMode }) {
  const copy = content[mode];
  const [state, formAction] = useActionState(actions[mode], initialState);
  const hasPassword = mode !== "forgot-password";
  const searchParams = useSearchParams();
  const starter = searchParams.get("starter");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form action={formAction}>
          {starter ? (
            <input type="hidden" name="starter" value={starter} />
          ) : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${mode}-email`}>Email</FieldLabel>
              <Input
                autoComplete="email"
                id={`${mode}-email`}
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </Field>

            {hasPassword && (
              <Field>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
                  {mode === "login" && (
                    <Link
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  id={`${mode}-password`}
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
                {mode === "signup" && (
                  <FieldDescription>
                    Use at least 8 characters.
                  </FieldDescription>
                )}
              </Field>
            )}

            <SubmitButton>{copy.submit}</SubmitButton>
            <ActionFeedback state={state} />
          </FieldGroup>
        </form>

        {mode !== "forgot-password" && (
          <>
            <FieldSeparator>or</FieldSeparator>
            <GoogleButton />
          </>
        )}
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
        <span>{copy.alternate}</span>
        <Button asChild className="h-auto px-1 py-0" variant="link">
          <Link href={copy.alternateHref}>{copy.alternateAction}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  return (
    <Suspense fallback={null}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
