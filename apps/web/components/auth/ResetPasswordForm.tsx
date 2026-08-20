"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  updatePassword,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      Update password
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    updatePassword,
    {},
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          Replace your old password with a secure new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="new-password"
                minLength={8}
                name="password"
                required
                type="password"
              />
              <FieldDescription>Use at least 8 characters.</FieldDescription>
            </Field>
            <UpdateButton />
            {state.error && <FieldError>{state.error}</FieldError>}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
