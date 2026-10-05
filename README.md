# Margin — CAT Reading Room

A small private CAT Reading Comprehension practice app for a friend group. It includes 21 Aeon essay links, four high-difficulty questions per essay, answer review with distractor reasoning, and a shared library with individually private attempts.

The quiz screen intentionally contains no article passage or paragraphs. Each quiz first identifies the exact essay and author and links to the original Aeon page. Students read there, return to the quiz, and see answers and reasoning only after submitting.

## Run locally

1. Install Node.js 20 or newer.
2. From this folder run `npm install` and `npm run dev`.
3. Without Supabase settings the app runs in preview mode and stores attempts only in that browser. Preview mode is for trying the interface; it does not sync friends’ activity.

## Enable shared accounts and private results

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). The final query returns the group's invite code; share that code only with your friends.
3. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings.
4. Run `npm run dev` again. Each friend creates an account and joins with the group invite code. Supabase row-level security restricts attempt reads to the account that created them.
5. In Supabase Auth, set the site's production URL and Vercel callback URL. For a private study group, keep email confirmation enabled and use the invite code only with your members.

Only the Supabase URL and publishable/anon key belong in the client. Never put a Supabase service-role key in this app or in Vercel's `VITE_` variables.

## Deploy to Vercel

Import the GitHub repository into Vercel, choose the Vite preset, and set the same two environment variables for Production (and Preview if needed). The build command is `npm run build`; the output directory is `dist`. The included `vercel.json` handles client-side routes.

## Question design

Each set covers central claim and scope, supported inference, the function and limits of evidence, and counterevidence. Distractors target common CAT errors: scope inflation, reversal, premise substitution, non sequitur, anecdote-to-law, and attacking a straw version of the argument. The source essay, byline and “read first” link remain visible before the attempt; explanations and trap notes appear only after submission.

The questions are original practice items derived from the authorised essays, not official CAT questions. Please review the items against your licensed source copies before treating them as a final answer key.
