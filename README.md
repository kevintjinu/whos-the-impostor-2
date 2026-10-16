# Who's the Impostor 2.0

An offline, in-person word game built with React, TypeScript and Vite. Use Node 22.12+ (or a Vite-compatible newer release).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Use the printed network address to play from a phone on the same Wi-Fi. Player IDs and assignment randomness use browser `crypto.getRandomValues`, including on ordinary HTTP LAN addresses. No network service is required by the game itself.

## Play

Add 3–12 players, choose Chaos, Close Call, No Clue or Double Trouble (6+ players), and privately reveal roles. Only the private reveal requires passing the phone. Give clues in the displayed order; questions, discussion, voting and tie revotes all happen aloud.

Record one accused player, or two distinct players in Double Trouble, then select **Lock & Reveal Impostor**. The accusation is final. Incorrect accusations award the round to the impostor side immediately. If every impostor was correctly accused, that side gets one cooperative verbal guess of the majority word. Record the judgement before the answer is shown. A correct guess wins for the impostors; an incorrect guess wins for the majority. Answers and results appear in the same view.

Casual has no points. Competitive awards one point to each player on the winning side, once per completed round. Quick plays five rounds, Standard ten, and Endless continues until End Game. Next Round preserves settings, scores and word history. The immediately previous impostor(s) cannot be selected in the next round; all other eligible players are equally likely, without count balancing or fixed rotation. New Session clears the old session and returns to Configuration with players and settings retained. It makes no random draw until Continue starts a fresh Round 1. Leaving an unfinished reveal pauses it; Continue with unchanged setup resumes the same assignment.

Session data and history live only in memory. Reloading the page resets the game. Returning Home from a finished session retains the summary in memory until a fresh session starts; no secret or session data is persisted or transmitted. The privacy controls prevent casual screen exposure during play; this is a shared-device game, not protection against someone inspecting browser memory or developer tools.

## Validate

```sh
npm test
npm run lint
npm run build
npx tsc -b
git diff --check
npm audit
```

The build outputs static assets to `dist/`. `npm run preview` serves that production build locally. Deployment requires a separate explicit approval.

GitHub Pages deployment settings and approval-gated release steps are documented in [DEPLOYMENT.md](DEPLOYMENT.md). The Actions workflow supplies the repository-specific Vite base path only for a Pages build, so local development and LAN testing stay at `/`.

The dependency-free browser scripts use a running Chrome instance with remote debugging on loopback port 9340. With the app running, use `node scripts/verify-v1-browser.mjs http://127.0.0.1:5175/` for the full session/responsive matrix (`--smoke` for two shorter journeys), and `node scripts/verify-reveal-browser.mjs http://127.0.0.1:5175/` for interruption, long-name and duplicate-handoff regressions. They use synthetic players, keep secret assignments out of logs and save public-state screenshots under `/tmp/`.

Domain rules and session transitions live in `src/game/`; the word bank contains 300 majority words across six categories. See [round engine notes](src/game/ROUND_ENGINE.md) for randomness, word recycling, privacy boundaries and session rules. No backend, accounts, analytics or runtime services are used.
