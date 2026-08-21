import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password | Chessloom",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
