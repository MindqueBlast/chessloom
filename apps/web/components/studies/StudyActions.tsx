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
  reimportLichessStudyAction,
  reimportPgnAction,
  renameStudyAction,
} from "@/lib/actions/studies";
import { toastCopy } from "@/lib/toasts";

export function StudyActions({
  studyId,
  initialTitle,
  sourceType,
  lichessStudyUrl,
}: {
  studyId: string;
  initialTitle: string;
  sourceType: string;
  lichessStudyUrl?: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [reimportOpen, setReimportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lichessRefreshOpen, setLichessRefreshOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isLichessStudy = sourceType === "lichess_study";

  function rename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameStudyAction(studyId, title);
      if (result.ok) {
        toast.success(toastCopy.studyRenamed);
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
        toast.success(toastCopy.studyReimported);
        form.reset();
        setReimportOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteStudyAction(studyId);
      if (result.ok) {
        setDeleteOpen(false);
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success(toastCopy.studyDeleted);
        }
        router.push("/dashboard");
      } else {
        toast.error(result.error);
      }
    });
  }

  function refreshFromLichess() {
    startTransition(async () => {
      const result = await reimportLichessStudyAction(studyId);
      if (result.ok) {
        setLichessRefreshOpen(false);
        toast.success(toastCopy.studyReimported);
        router.refresh();
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
        {isLichessStudy ? (
          <Dialog open={lichessRefreshOpen} onOpenChange={setLichessRefreshOpen}>
            <DialogTrigger asChild>
              <Button type="button" disabled={pending || !lichessStudyUrl}>
                <RefreshCw />
                Refresh from Lichess
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Refresh this study from Lichess?</DialogTitle>
                <DialogDescription>
                  Chapters and moves will be replaced. Training progress is kept
                  only for positions with the same path in the updated study.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={refreshFromLichess}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  {pending ? "Refreshing…" : "Refresh study"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
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
                    <Label htmlFor="reimport-pgn-text">
                      Paste replacement PGN
                    </Label>
                    <Textarea
                      id="reimport-pgn-text"
                      name="reimportPgnText"
                      placeholder={'[Event "Updated repertoire"]\n\n1. e4 e5 *'}
                      className="min-h-40 font-mono"
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reimport-pgn-file">
                      Or choose a PGN file
                    </Label>
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
        )}

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={pending}>
              <Trash2 />
              Delete study
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete this study?</DialogTitle>
              <DialogDescription>
                This permanently removes the study and all of its training data.
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={remove}
              >
                {pending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                {pending ? "Deleting…" : "Delete study"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
