"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Monitor, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { usePalette } from "@/components/providers/PaletteProvider";
import { updateDefaultSideModeAction } from "@/lib/actions/settings";
import {
  LEARN_AUTO_CONTINUE_KEY,
  PALETTE_OPTIONS,
  SOUND_STORAGE_KEY,
  normalizeLearnAutoContinue,
  normalizeSoundEnabled,
  type DefaultSideMode,
  type PaletteId,
  type ThemePreference,
} from "@/lib/settings/preferences";
import { toastCopy } from "@/lib/toasts";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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

function readLocalFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return normalizeSoundEnabled(window.localStorage.getItem(key));
  } catch {
    return false;
  }
}

function writeLocalFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Ignore storage failures.
  }
}

export function SettingsForm({
  defaultSideMode,
}: {
  defaultSideMode: DefaultSideMode;
}) {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [sideMode, setSideMode] = useState(defaultSideMode);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [learnAutoContinue, setLearnAutoContinue] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSoundEnabled(readLocalFlag(SOUND_STORAGE_KEY));
    setLearnAutoContinue(
      normalizeLearnAutoContinue(
        window.localStorage.getItem(LEARN_AUTO_CONTINUE_KEY),
      ),
    );
  }, []);

  function saveTheme(value: ThemePreference) {
    setTheme(value);
  }

  function savePalette(value: PaletteId) {
    setPalette(value);
  }

  function saveSoundEnabled(value: boolean) {
    setSoundEnabled(value);
    writeLocalFlag(SOUND_STORAGE_KEY, value);
    toast.success(toastCopy.settingsSaved);
  }

  function saveLearnAutoContinue(value: boolean) {
    setLearnAutoContinue(value);
    writeLocalFlag(LEARN_AUTO_CONTINUE_KEY, value);
    toast.success(toastCopy.settingsSaved);
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
        <FieldLabel>Appearance</FieldLabel>
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
        <FieldLabel>Palette</FieldLabel>
        <FieldDescription>
          Accent schemes within Chessloom&apos;s cool premium family.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          {PALETTE_OPTIONS.map((option) => {
            const selected = mounted && palette === option.id;
            return (
              <Button
                key={option.id}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => savePalette(option.id)}
                className="gap-2"
              >
                <span
                  aria-hidden
                  className="size-3.5 rounded-full ring-1 ring-foreground/20"
                  style={{ backgroundColor: option.swatch }}
                />
                {option.label}
              </Button>
            );
          })}
        </div>
      </Field>

      <Field>
        <FieldLabel>Default side</FieldLabel>
        <FieldDescription>
          Used when you start Learn or Practice. Random is a per-session option
          on the study and training screens and is not saved here.
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

      <Field>
        <FieldLabel>Sound</FieldLabel>
        <FieldDescription>
          Soft Web Audio tones for moves and feedback. Off until you turn this
          on.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={soundEnabled ? "default" : "outline"}
            aria-pressed={soundEnabled}
            onClick={() => saveSoundEnabled(true)}
          >
            <Volume2 />
            On
          </Button>
          <Button
            type="button"
            variant={!soundEnabled ? "default" : "outline"}
            aria-pressed={!soundEnabled}
            onClick={() => saveSoundEnabled(false)}
          >
            <VolumeX />
            Off
          </Button>
        </div>
      </Field>

      <Field>
        <FieldLabel>Learn auto-continue</FieldLabel>
        <FieldDescription>
          After a correct move in Learn, advance automatically without clicking
          Continue.
        </FieldDescription>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={learnAutoContinue ? "default" : "outline"}
            aria-pressed={learnAutoContinue}
            onClick={() => saveLearnAutoContinue(true)}
          >
            On
          </Button>
          <Button
            type="button"
            variant={!learnAutoContinue ? "default" : "outline"}
            aria-pressed={!learnAutoContinue}
            onClick={() => saveLearnAutoContinue(false)}
          >
            Off
          </Button>
        </div>
      </Field>
    </FieldGroup>
  );
}
