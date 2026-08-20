"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteStudyAction,
  reimportPgnAction,
  renameStudyAction,
} from "@/lib/actions/studies";

export function StudyActions({
  studyId,
  initialTitle,
}: {
  studyId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [reimportOpen, setReimportOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameStudyAction(studyId, title);
      if (result.ok) {
        toast.success("Study renamed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function reimport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const pastedPgn = formData.get("reimportPgnText");
    const uploadedFile = formData.get("reimportPgnFile");
    let pgnText = typeof pastedPgn === "string" ? pastedPgn : "";

    if (uploadedFile instanceof File && uploadedFile.size > 0) {
      pgnText = await uploadedFile.text();
    }

    startTransition(async () => {
      const result = await reimportPgnAction(studyId, { pgnText });
      if (result.ok) {
        toast.success("Study reimported. Matching progress was preserved.");
        form.reset();
        setReimportOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete this study and all of its training data?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStudyAction(studyId);
      if (result.ok) {
        toast.success("Study deleted.");
        router.push("/dashboard");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
      <form onSubmit={rename} className="space-y-2">
        <Label htmlFor="study-title">Study title</Label>
        <div className="flex gap-2">
          <Input
            id="study-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            disabled={pending}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
            Rename
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        <Dialog open={reimportOpen} onOpenChange={setReimportOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={pending}>
              <RefreshCw />
              Reimport PGN
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={reimport} className="contents">
              <DialogHeader>
                <DialogTitle>Replace this study&apos;s PGN?</DialogTitle>
                <DialogDescription>
                  Chapters and moves will be replaced. Training progress is
                  kept only for positions with the same path in the new PGN.
                  If the import fails, the current study remains unchanged.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reimport-pgn-text">Paste replacement PGN</Label>
                  <Textarea
                    id="reimport-pgn-text"
                    name="reimportPgnText"
                    placeholder={'[Event "Updated repertoire"]\n\n1. e4 e5 *'}
                    className="min-h-40 font-mono"
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reimport-pgn-file">Or choose a PGN file</Label>
                  <Input
                    id="reimport-pgn-file"
                    name="reimportPgnFile"
                    type="file"
                    accept=".pgn,application/x-chess-pgn,text/plain"
                    disabled={pending}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <FileUp />
                  )}
                  {pending ? "Reimporting…" : "Replace study"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          variant="destructive"
          onClick={remove}
          disabled={pending}
        >
          <Trash2 />
          Delete study
        </Button>
      </div>
    </div>
  );
}
