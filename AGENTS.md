# Who's the Impostor 2.0 — Project Rules

## Product boundary

- Build a mobile-first, pass-the-phone social deduction game for people playing together in person.
- The phone manages setup, private role/word reveals, fair assignments, progression, private voting, ties, results, scoring, and local history. Clues, discussion, questions, answers, bluffing, accusations, and defence stay verbal; never ask players to type spoken clues.
- Locked modes: **Chaos** (unrelated decoy), **Close Call** (related decoy), **No Clue** (no impostor word), and **Double Trouble** (two impostors with the same decoy in V1; only for sufficiently large groups). Do not redefine them.
- V1 flow: Players → Settings → Private Role Reveal → First Clue Player → Spoken Clues → Open Discussion → Question Round → Final Discussion → Private Voting → Tie Defence/runoff → Accused Player Reveal → Role Reveal → caught impostor's final guess → Results → Next Round.

## Gameplay integrity

- Keep game/business logic independent of React so it can be unit tested.
- Do not use naive randomness for important choices. Balance impostor frequency while remaining unpredictable. Choose the first clue player independently and keep the two histories separate. Avoid recently used words over time.
- Question assignments: 1 for 3–5 players, 2 for 6–8, and 3 for 9+; eventually make assignments fair and randomized.
- Voting is private and pass-the-phone: exactly one deliberately confirmed vote per player, no previous votes or running totals, and hide each choice before passing the phone. Never implement voting as an unguarded click counter.
- Resolve ties through defence/discussion then a runoff among tied players. If the runoff ties, the impostor escapes. Never resolve a tie by array order.

## Checkpoint workflow

- Work only on the requested checkpoint: build → run → inspect → test → correct → validate → lock. Do not implement future screens or infrastructure early.
- Approved checkpoints are locked. Preserve their behaviour and design unless the user explicitly reopens them. Record meaningful lock decisions in project documentation when applicable.
- Prefer small, useful modules over premature folders, abstractions, giant components, or giant utility files. Avoid duplicated logic and keep TypeScript strict; do not use `any` without a documented reason.

## UI, responsive design, and accessibility

- Design mobile-first for portrait phones, while supporting small/large phones, tablets, laptops, and desktops with fluid layouts.
- Do not hard-code whole-screen heights, shrink an entire UI, mask broken layouts with `overflow: hidden`, use spacer elements, or position primary layouts with arbitrary pixels.
- Use calm, premium styling: strong typography and hierarchy, generous spacing, restrained surfaces, one main accent, subtle purposeful motion, large touch targets, and one clear primary action. Avoid stereotypical gaming visuals, gratuitous gradients/glow, emoji, cards, shadows, dashboards, and clutter.
- Use semantic HTML, real buttons, labelled inputs, visible keyboard focus, good contrast, and generally 44×44px minimum targets. Do not communicate important state by colour alone. Respect `prefers-reduced-motion`.

## Security and data

- Keep V1's attack surface small. Do not add a backend, API, database, accounts, authentication, admin features, cloud sessions, secrets, or API keys unless explicitly requested. Before any future backend work, stop for a security architecture review.
- Treat all user and persisted data as untrusted. Trim, length-limit, and validate player names; prevent invalid/duplicate entries where appropriate. Validate localStorage data before use and store only non-sensitive game preferences/history.
- Render user content through React's escaped text handling. Do not use `dangerouslySetInnerHTML` without explicit security review and justification.
- Never place secrets in frontend code or commits. Keep `.env`, `.env.local`, and `.env.*.local` ignored. If variables are later needed, add only placeholder names to `.env.example`; remember browser-shipped values are public.

## Dependencies and validation

- Use React, TypeScript, Vite, browser APIs, and small local utilities. Do not install dependencies without approval; specifically avoid UI/CSS frameworks, animation libraries, state managers, backend/database/auth libraries, and analytics unless requested and justified.
- At every checkpoint run `npm run lint` and `npm run build`; run automated tests once present. Never claim a check passed without running it.
- Prioritize tests for assignment fairness, word selection/history, voting invariants, ties/runoffs, Double Trouble, transitions, scoring, and persistence validation.
- Do not deploy unless explicitly requested. Before production, perform a separate evidence-based security review; never claim perfect security.
