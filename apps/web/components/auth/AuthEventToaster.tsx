"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, { kind: "error" | "success"; text: string }> = {
  login: { kind: "success", text: "Welcome back." },
  signup: { kind: "success", text: "Your account is ready." },
  confirmed: { kind: "success", text: "Your email has been confirmed." },
  oauth: { kind: "success", text: "Signed in with Google." },
  recovery: { kind: "success", text: "Recovery link verified." },
  "password-updated": {
    kind: "success",
    text: "Your password has been updated.",
  },
  "signed-out": { kind: "success", text: "You have been signed out." },
  "callback-error": {
    kind: "error",
    text: "The sign-in link is invalid or has expired.",
  },
};

export function AuthEventToaster() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get("auth");

  useEffect(() => {
    if (!event || !messages[event]) {
      return;
    }

    const message = messages[event];
    toast[message.kind](message.text);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("auth");
    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [event, pathname, router, searchParams]);

  return null;
}
