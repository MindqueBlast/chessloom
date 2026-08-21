import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Create an account | Chessloom",
};

export default function SignupPage() {
  return (
    <AuthPageShell>
      <AuthForm mode="signup" />
    </AuthPageShell>
  );
}
