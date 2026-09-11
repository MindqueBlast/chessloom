import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ReminderRow = {
  user_id: string;
  due_count: number;
  email: string | null;
};

async function sendResendEmail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Chessloom <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false as const, error: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false as const, error: body || response.statusText };
  }

  return { ok: true as const };
}

/**
 * Vercel Cron: send due-card reminders to opted-in users.
 * Secure with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: "RESEND_API_KEY not set — configure Resend to enable emails.",
      },
      { status: 200 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://chessloom.vercel.app";
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: dueRows, error: dueError } = await supabase
    .from("position_progress")
    .select("user_id")
    .lte("due_at", nowIso);

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }

  const dueByUser = new Map<string, number>();
  for (const row of dueRows ?? []) {
    dueByUser.set(row.user_id, (dueByUser.get(row.user_id) ?? 0) + 1);
  }

  if (dueByUser.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, candidates: 0 });
  }

  const userIds = [...dueByUser.keys()];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email_reminders_enabled, display_name")
    .in("id", userIds)
    .eq("email_reminders_enabled", true);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const optedIn = new Set((profiles ?? []).map((profile) => profile.id));
  const reminders: ReminderRow[] = [];

  for (const userId of optedIn) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      continue;
    }

    reminders.push({
      user_id: userId,
      due_count: dueByUser.get(userId) ?? 0,
      email: user.email,
    });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const reminder of reminders) {
    if (!reminder.email || reminder.due_count <= 0) continue;

    const result = await sendResendEmail({
      to: reminder.email,
      subject:
        reminder.due_count === 1
          ? "You have 1 chess position due on Chessloom"
          : `You have ${reminder.due_count} chess positions due on Chessloom`,
      text: [
        `You have ${reminder.due_count} position${reminder.due_count === 1 ? "" : "s"} due for review.`,
        ``,
        `Open your dashboard: ${siteUrl}/dashboard`,
        ``,
        `Turn off these emails anytime in Settings.`,
        `— Chessloom`,
      ].join("\n"),
    });

    if (result.ok) {
      sent += 1;
    } else {
      failures.push(`${reminder.user_id}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: reminders.length,
    sent,
    failures: failures.slice(0, 10),
  });
}
