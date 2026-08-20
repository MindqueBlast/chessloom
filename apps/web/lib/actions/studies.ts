"use server";

import { parsePgnToStudy } from "@chessloom/chess-core";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { flattenStudyTree, importSource } from "@/lib/studies/import";
import { toastCopy } from "../toasts";

export type StudyActionResult =
  | { ok: true; studyId: string; warning?: string }
  | { ok: false; error: string };

export type ImportPgnInput = {
  title?: string;
  pgnText?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The study could not be imported.";
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function importFailure(
  error: unknown,
  uploadedPgn: { client: SupabaseClient; path: string } | null,
): Promise<StudyActionResult> {
  const message = errorMessage(error);
  if (!uploadedPgn) {
    return { ok: false, error: message };
  }

  try {
    const { error: cleanupError } = await uploadedPgn.client.storage
      .from("pgns")
      .remove([uploadedPgn.path]);

    if (cleanupError) {
      return {
        ok: false,
        error: `${message} Cleanup of the uploaded PGN also failed: ${cleanupError.message}`,
      };
    }
  } catch (cleanupError) {
    return {
      ok: false,
      error: `${message} Cleanup of the uploaded PGN also failed: ${errorMessage(cleanupError)}`,
    };
  }

  return { ok: false, error: message };
}

async function importPgn(
  input: ImportPgnInput,
): Promise<StudyActionResult> {
  const pgnText = input.pgnText?.trim();
  if (!pgnText) {
    return { ok: false, error: "Paste a PGN or choose a PGN file." };
  }

  let uploadedPgn: { client: SupabaseClient; path: string } | null = null;

  try {
    const parsedStudy = parsePgnToStudy(pgnText);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Sign in before importing a study." };
    }

    const { sourceType, useStorage } = importSource(pgnText.length);
    let storagePath: string | null = null;

    if (useStorage) {
      storagePath = `${user.id}/${crypto.randomUUID()}.pgn`;
      const { error: uploadError } = await supabase.storage
        .from("pgns")
        .upload(storagePath, new Blob([pgnText], { type: "application/x-chess-pgn" }));

      if (uploadError) {
        return { ok: false, error: `PGN upload failed: ${uploadError.message}` };
      }

      uploadedPgn = { client: supabase, path: storagePath };
    }

    const title = input.title?.trim() || parsedStudy.title;
    const { data: studyId, error: importError } = await supabase.rpc(
      "import_study",
      {
        p_title: title,
        p_source_type: sourceType,
        p_pgn_text: useStorage ? null : pgnText,
        p_storage_path: storagePath,
        p_chapters: flattenStudyTree(parsedStudy),
      },
    );

    if (importError || typeof studyId !== "string") {
      return importFailure(
        new Error(importError?.message ?? "The study could not be saved."),
        uploadedPgn,
      );
    }

    uploadedPgn = null;
    revalidatePath("/dashboard");
    return { ok: true, studyId };
  } catch (error) {
    return importFailure(error, uploadedPgn);
  }
}

export async function importPgnAction(
  input: ImportPgnInput,
): Promise<StudyActionResult> {
  return importPgn(input);
}

export async function importPgnFormAction(
  _previousState: StudyActionResult | null,
  formData: FormData,
): Promise<StudyActionResult> {
  const pastedPgn = formData.get("pgnText");
  const uploadedFile = formData.get("pgnFile");
  let pgnText = typeof pastedPgn === "string" ? pastedPgn : "";

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    pgnText = await uploadedFile.text();
  }

  const title = formData.get("title");
  return importPgn({
    title: typeof title === "string" ? title : undefined,
    pgnText,
  });
}

export async function reimportPgnAction(
  studyId: string,
  input: ImportPgnInput,
): Promise<StudyActionResult> {
  const pgnText = input.pgnText?.trim();
  if (!pgnText) {
    return { ok: false, error: "Paste a PGN or choose a PGN file." };
  }

  let uploadedPgn: { client: SupabaseClient; path: string } | null = null;

  try {
    const parsedStudy = parsePgnToStudy(pgnText);
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Sign in before reimporting a study." };
    }

    const { data: study, error: studyError } = await supabase
      .from("studies")
      .select("pgn_storage_path")
      .eq("id", studyId)
      .maybeSingle();

    if (studyError) {
      return { ok: false, error: studyError.message };
    }

    if (!study) {
      return { ok: false, error: "The study could not be reimported." };
    }

    const { sourceType, useStorage } = importSource(pgnText.length);
    let storagePath: string | null = null;

    if (useStorage) {
      storagePath = `${user.id}/${crypto.randomUUID()}.pgn`;
      const { error: uploadError } = await supabase.storage
        .from("pgns")
        .upload(storagePath, new Blob([pgnText], { type: "application/x-chess-pgn" }));

      if (uploadError) {
        return { ok: false, error: `PGN upload failed: ${uploadError.message}` };
      }

      uploadedPgn = { client: supabase, path: storagePath };
    }

    const { data: reimportedStudyId, error: reimportError } =
      await supabase.rpc("reimport_study", {
        p_study_id: studyId,
        p_source_type: sourceType,
        p_pgn_text: useStorage ? null : pgnText,
        p_storage_path: storagePath,
        p_chapters: flattenStudyTree(parsedStudy),
      });

    if (reimportError || reimportedStudyId !== studyId) {
      return importFailure(
        new Error(reimportError?.message ?? "The study could not be reimported."),
        uploadedPgn,
      );
    }

    uploadedPgn = null;

    if (
      study.pgn_storage_path &&
      study.pgn_storage_path !== storagePath
    ) {
      try {
        const { error: cleanupError } = await supabase.storage
          .from("pgns")
          .remove([study.pgn_storage_path]);

        if (cleanupError) {
          console.error("Superseded PGN cleanup failed:", cleanupError.message);
        }
      } catch (cleanupError) {
        // The database reimport is already committed; an orphaned private file
        // must not make the transactional replacement appear to have failed.
        console.error("Superseded PGN cleanup failed:", cleanupError);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/studies/${studyId}`);
    return { ok: true, studyId };
  } catch (error) {
    return importFailure(error, uploadedPgn);
  }
}

export async function renameStudyAction(
  studyId: string,
  title: string,
): Promise<StudyActionResult> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return { ok: false, error: "Enter a study title." };
  }

  const supabase = await createClient();
  const { data: renamedStudy, error } = await supabase
    .from("studies")
    .update({ title: normalizedTitle })
    .eq("id", studyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!renamedStudy) {
    return { ok: false, error: "The study could not be renamed." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/studies/${studyId}`);
  return { ok: true, studyId };
}

function isMissingStorageObject(error: {
  message?: string;
  statusCode?: string | number;
} | null): boolean {
  if (!error) return true;
  const status = String(error.statusCode ?? "");
  const message = error.message ?? "";
  return status === "404" || /not found|does not exist/i.test(message);
}

export async function deleteStudyAction(
  studyId: string,
): Promise<StudyActionResult> {
  const supabase = await createClient();
  const { data: study, error: readError } = await supabase
    .from("studies")
    .select("pgn_storage_path")
    .eq("id", studyId)
    .single();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  const storagePath = study.pgn_storage_path;
  const { error: deleteError } = await supabase
    .from("studies")
    .delete()
    .eq("id", studyId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/dashboard");

  if (!storagePath) {
    return { ok: true, studyId };
  }

  try {
    const { error: storageError } = await supabase.storage
      .from("pgns")
      .remove([storagePath]);

    if (!isMissingStorageObject(storageError)) {
      console.error("PGN storage cleanup failed:", storageError.message);
      return { ok: true, studyId, warning: toastCopy.studyDeletedStorageWarning };
    }
  } catch (error) {
    console.error("PGN storage cleanup failed:", error);
    return { ok: true, studyId, warning: toastCopy.studyDeletedStorageWarning };
  }

  return { ok: true, studyId };
}
