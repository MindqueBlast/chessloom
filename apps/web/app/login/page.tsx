import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Sign in | Chessloom",
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthForm mode="login" />
    </AuthPageShell>
  );
}
