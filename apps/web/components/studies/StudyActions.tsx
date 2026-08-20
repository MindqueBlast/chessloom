"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteStudyAction,
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
  );
}
