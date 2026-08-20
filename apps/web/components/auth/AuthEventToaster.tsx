"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { toastCopy } from "@/lib/toasts";

const messages: Record<string, { kind: "error" | "success"; text: string }> = {
  login: { kind: "success", text: toastCopy.auth.login },
  signup: { kind: "success", text: toastCopy.auth.signup },
  confirmed: { kind: "success", text: toastCopy.auth.confirmed },
  oauth: { kind: "success", text: toastCopy.auth.oauth },
  recovery: { kind: "success", text: toastCopy.auth.recovery },
  "password-updated": {
    kind: "success",
    text: toastCopy.auth["password-updated"],
  },
  "signed-out": { kind: "success", text: toastCopy.auth["signed-out"] },
  "callback-error": {
    kind: "error",
    text: toastCopy.auth["callback-error"],
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
