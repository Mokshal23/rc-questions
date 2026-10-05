# Margin — CAT Reading Room

A small private CAT Reading Comprehension practice app for a friend group. It includes 21 Aeon essay links, six high-difficulty questions per essay (126 total), answer review with distractor reasoning, and a shared library with individually private attempts. Six questions deliberately provide a deeper drill than the four-question passage sets commonly used in CAT papers; they are practice sets, not a claim about the exam's exact format.

The library also includes ten additional Scientific American and Nautilus source links as a reading list. They are not quizzes yet: the 3,000–6,000-word requirement has not been confirmed for each source, and article-derived question generation/distribution needs to be covered by the relevant rights or permission.

The interface supports light and dark themes; the preference is saved in the current browser. See [`research/CAT-VARC-2020-2025.md`](research/CAT-VARC-2020-2025.md) for the six-year VARC/RC topic and trap analysis, its sources, and licensing notes for adding further publisher articles.

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

Each set asks about the central claim and its scope, a supported inference, how evidence functions, counterevidence, a necessary assumption, and application to a new case. I reviewed an archived CAT 2024 Slot 1 VARC paper and its worked solutions while designing the options: its RC items reward linking claims across the passage and distinguish close alternatives through changes in causal direction, scope, time frame, attribution, and the exact question asked. The distractors in this bank use those same failure modes, along with partial-truth, over-inference, and true-but-irrelevant choices. See the [CAT 2024 Slot 1 question paper and solutions](https://catking.in/file/media_library/10314/6a16cda0d99ba.pdf).

The source essay, byline and “read first” link remain visible before the attempt. The quiz itself has no passage text. Correct answers, explanations and trap notes appear only after submission.

The questions are original practice items derived from the authorised essays, not official CAT questions. Please review the items against your licensed source copies before treating them as a final answer key.
