"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  login,
  requestPasswordReset,
  signInWithGoogle,
  signup,
  type AuthActionState,
} from "@/lib/actions/auth";
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
  const [state, formAction] = useActionState(signInWithGoogle, initialState);

  return (
    <form action={formAction}>
      <FieldGroup>
        <SubmitButton>
          <LogIn aria-hidden="true" />
          Continue with Google
        </SubmitButton>
        <ActionFeedback state={state} />
      </FieldGroup>
    </form>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const copy = content[mode];
  const [state, formAction] = useActionState(actions[mode], initialState);
  const hasPassword = mode !== "forgot-password";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form action={formAction}>
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
