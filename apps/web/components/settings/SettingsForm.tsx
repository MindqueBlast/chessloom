"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { updateDefaultSideModeAction } from "@/lib/actions/settings";
import {
  type DefaultSideMode,
  type ThemePreference,
} from "@/lib/settings/preferences";
import { toastCopy } from "@/lib/toasts";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const sideOptions: Array<{ value: DefaultSideMode; label: string }> = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "both", label: "Both" },
];

export function SettingsForm({
  defaultSideMode,
}: {
  defaultSideMode: DefaultSideMode;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [sideMode, setSideMode] = useState(defaultSideMode);
  const [pending, startTransition] = useTransition();

  function saveTheme(value: ThemePreference) {
    setTheme(value);
  }

  function saveSideMode(value: DefaultSideMode) {
    if (value === sideMode) return;
    const previous = sideMode;
    setSideMode(value);
    startTransition(async () => {
      const result = await updateDefaultSideModeAction(value);
      if (result.ok) {
        toast.success(toastCopy.settingsSaved);
        return;
      }
      setSideMode(previous);
      toast.error(result.error);
    });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Theme</FieldLabel>
        <FieldDescription>
          Dark by default. Light and system follow your display.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = mounted && theme === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => saveTheme(option.value)}
              >
                <Icon />
                {option.label}
              </Button>
            );
          })}
        </div>
      </Field>

      <Field>
        <FieldLabel>Default side</FieldLabel>
        <FieldDescription>
          Used when you start Learn or Practice. Random remains a per-session
          option later.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          {sideOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={sideMode === option.value ? "default" : "outline"}
              aria-pressed={sideMode === option.value}
              disabled={pending}
              onClick={() => saveSideMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Field>
    </FieldGroup>
  );
}
