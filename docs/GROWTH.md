# Chessloom growth ritual (solo nights/weekends)

Goal: ~1,000 signed-up users with ≥20% week-1 return. Stay free & open source.

## Weekly block (~3 hours)

1. **Product (if needed):** one activation/retention ticket only.
2. **One public post** (rotate): Reddit (where allowed), Lichess forum/Discord, LinkedIn/X.
3. **Reply to every comment** within 48 hours.
4. **5 coach / creator DMs** — offer free early access; “import your student’s public study.”
5. **Metrics (15 min):** PostHog funnel — signup → starter_imported / import_succeeded → first_train_started → return_day_7.

## Messaging template

> I built Chessloom — a free, open-source opening trainer that quizzes *your* repertoire (or a curated beginner opening from Lichess), with Learn → Practice → FSRS review. No AI inventing moves.
>
> Try a starter opening in under a minute: https://chessloom.vercel.app/signup?starter=italian-beginner

## Honest limits (say them)

- Public Lichess studies only (for now)
- You bring the repertoire, or pick a curated starter
- Free OSS — no paid course library

## Do not

- Buy ads before `first_train_started` ≥ 40% of new signups
- Spam the same subreddit weekly
- Ship new training modes until ≥200 users and activation is green

## Soft launch checklist

- [ ] Starter catalog links still public
- [ ] Google OAuth + `/auth/callback` in Supabase redirect URLs
- [ ] Privacy / Terms linked from landing footer
- [ ] Due reminder cron configured (`CRON_SECRET`, `RESEND_API_KEY`) if emails enabled
