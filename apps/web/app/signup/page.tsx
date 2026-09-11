import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Create an account | Chessloom",
};

export default function SignupPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthPageShell>
  );
}
