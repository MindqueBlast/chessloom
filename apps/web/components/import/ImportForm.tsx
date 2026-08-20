"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  importPgnFormAction,
  type StudyActionResult,
} from "@/lib/actions/studies";

const initialState: StudyActionResult | null = null;

export function ImportForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    importPgnFormAction,
    initialState,
  );

  useEffect(() => {
    if (!state) {
      return;
    }

    if (state.ok) {
      toast.success("Study imported.");
      router.push(`/studies/${state.studyId}`);
      return;
    }

    toast.error(state.error);
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Study title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Use the PGN event name"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use the first game&apos;s Event header.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pgnText">Paste PGN</Label>
        <Textarea
          id="pgnText"
          name="pgnText"
          placeholder={'[Event "My repertoire"]\n\n1. e4 e5 2. Nf3 *'}
          className="min-h-64 font-mono"
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or upload a file
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pgnFile">PGN file</Label>
        <Input
          id="pgnFile"
          name="pgnFile"
          type="file"
          accept=".pgn,application/x-chess-pgn,text/plain"
        />
        <p className="text-xs text-muted-foreground">
          Uploaded files take precedence over pasted text.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <FileUp />
        )}
        {pending ? "Importing…" : "Import study"}
      </Button>
    </form>
  );
}
