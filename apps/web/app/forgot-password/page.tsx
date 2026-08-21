import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Reset password | Chessloom",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <AuthForm mode="forgot-password" />
    </AuthPageShell>
  );
}
