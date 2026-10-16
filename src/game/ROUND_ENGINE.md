# Round engine notes

The engine keeps role assignment and word selection outside React. `createRound` accepts the current players, validated settings, session history and an injectable random source. Production calls use `crypto.getRandomValues`; tests inject fixed sequences of unsigned 32-bit integers (0 through 0xffffffff). There is no insecure fallback.

## Role selection with no consecutive impostors

- Round one samples the full roster uniformly. Later single-impostor rounds exclude only the immediately previous impostor, giving each of the remaining N−1 players probability 1/(N−1). A player can return after one intervening round. No count balancing or fixed rotation is enforced.
- Double Trouble excludes both previous-round impostors, then draws two distinct players uniformly without replacement. If M players are eligible, each unordered pair has probability 2/(M × (M−1)). With six players, four remain eligible after the first round. Both impostors still share the same decoy.
- This strict no-consecutive rule intentionally makes rounds dependent on the previous assignment. It replaces the previously approved independent-round policy at the user's explicit request. `previousImpostorIds` stores only the latest assignment and resets on a fresh session.
- The first clue player is selected independently from the entire roster with a separate draw. A player may be both the impostor and first clue giver.
- Historical frequency counts remain informational and never affect selection; only the last-round exclusion does.
- Bounded choices use rejection sampling: discard the incomplete tail of the 2^32 range before taking the remainder. This avoids modulo bias. The same sampler chooses among eligible words and decoys.
- Round creation runs only from guarded Configuration Continue and Next Round actions. React renders, private reveals and shared-screen navigation reuse the saved round and never draw again. Round numbers are scoped to the session; the round object reference distinguishes assignments during that session. There is no persistent or global round ID.

Checkpoints 01–05 are approved and locked. Checkpoint 05 was committed as `8e68341ecfc764109d1b292341d659af30e0f223`. The release audit explicitly authorizes the no-consecutive correction to the later independent-round policy.

## Words

The offline bank contains 300 distinct majority words: 50 in each of the six concrete categories. Each entry belongs to a curated five-word semantic group, making the other four words eligible Close Call decoys. Each group also names an explicitly reviewed Chaos pool with eight unrelated candidates. Chaos and Double Trouble use those unrelated candidates; both Double Trouble impostors receive the one decoy selected for that round. No Clue never selects or exposes a decoy. Mixed selects from all 300 entries.

Majority entry IDs are excluded until the selected category pool is exhausted. At exhaustion, only that pool's used IDs are cleared, then its full pool becomes eligible again; selecting a concrete category never silently falls through to another category. For Mixed, recycling happens after all 300 entries have been used.

Decoy selection first prefers candidate words not yet used as decoys in the session. If every eligible candidate word has appeared, it prefers majority/mode/decoy pairings not yet used. Once every pairing for that majority and mode has appeared, those pairing records are cleared and the candidate set is recycled. Selection within every eligible set remains cryptographically random. Normalized duplicate candidates and candidates identical to the majority are rejected; an entry with no valid candidate produces an explicit engine error.

## Public clue phase

The shared clue and discussion screen derives one circular speaking order from the saved `startingPlayerId` and the roster's stable IDs. It receives only that public order and the player roster; secret words and roles stay in the private round data. The same shared screen guides the group through verbal clues, questions, discussion, voting and tie defence. No per-player confirmation, assigned question, digital ballot or intermediate phone interaction is required.

## Public group accusation

After verbal voting, the Group Accusation phase records the group's final selection using stable player IDs. Chaos, Close Call and No Clue require one accused player; Double Trouble requires two distinct accused players. Draft selection is tied to the active round and survives Back/return navigation. One Lock & Reveal action freezes the accusation and reveals the actual impostors in the same view. No review dialog, locked-only view or second reveal action is required.

`endgame.ts` compares the complete selected set with the actual impostor set. A partial Double Trouble accusation is incorrect. An incorrect accusation immediately ends the round for the impostor side. A completely correct accusation reveals identities but withholds both words until the group records one final verbal guess judgement. Both Double Trouble impostors cooperate on that one guess. A correct guess wins for the impostor side; an incorrect guess wins for the majority.

The public screen receives an explicit phase projection: no private roles, word fields or actual impostor IDs during selection; only revealed identities while a guess is pending; answers and outcome only after completion. There is no typed word guess, ballot entry or separate results route.

## Session progression and scores

`session.ts` owns roster/settings snapshots, the active round, draft, endgame, completed results, scores and assignment/word history. Pure transition functions reject premature or repeated actions. App event handlers synchronously compare the expected session against the current reference before a transition, preventing stale callbacks and rapid taps from double-processing judgement, scoring, Next Round or New Session. Random creation happens only inside intentional start/advance handlers, never a React render, effect or state updater.

Casual awards no points. Competitive awards one point to every member of the winning side once per completed round. Equal scores share the same displayed rank. Quick finishes after five completed rounds; Standard after ten; Endless continues until End Game is selected on a public completed result. Finishing retains completed results and final scores. Next Round preserves players, settings, scores and word history and opens a fresh private reveal. Leaving a reveal pauses it; unchanged setup resumes the same round without a reroll. Changing the setup explicitly starts a new session.

New Session clears the old active session and returns the retained roster/settings to Configuration, without random draws or a new round. Only the next intentional Continue creates Round 1 with zero scores, empty results and fresh word/exclusion histories. All session data is memory-only and resets on a page reload. Nothing is stored in localStorage or sent to a service.
