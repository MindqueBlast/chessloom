"use server";

import { parsePgnToStudy } from "@chessloom/chess-core";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { flattenStudyTree, importSource } from "@/lib/studies/import";

export type StudyActionResult =
  | { ok: true; studyId: string }
  | { ok: false; error: string };

export type ImportPgnInput = {
  title?: string;
  pgnText?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The study could not be imported.";
}

async function importPgn(
  input: ImportPgnInput,
): Promise<StudyActionResult> {
  const pgnText = input.pgnText?.trim();
  if (!pgnText) {
    return { ok: false, error: "Paste a PGN or choose a PGN file." };
  }

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
      if (storagePath) {
        await supabase.storage.from("pgns").remove([storagePath]);
      }
      return {
        ok: false,
        error: importError?.message ?? "The study could not be saved.",
      };
    }

    revalidatePath("/dashboard");
    return { ok: true, studyId };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
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

export async function renameStudyAction(
  studyId: string,
  title: string,
): Promise<StudyActionResult> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return { ok: false, error: "Enter a study title." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("studies")
    .update({ title: normalizedTitle })
    .eq("id", studyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/studies/${studyId}`);
  return { ok: true, studyId };
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

  const { error: deleteError } = await supabase
    .from("studies")
    .delete()
    .eq("id", studyId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (study.pgn_storage_path) {
    await supabase.storage.from("pgns").remove([study.pgn_storage_path]);
  }

  revalidatePath("/dashboard");
  return { ok: true, studyId };
}
