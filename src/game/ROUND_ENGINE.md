# Round engine notes

The engine keeps role assignment and word selection outside React. `createRound` accepts the current players, validated settings, session history and an injectable random source. Production calls use `crypto.getRandomValues`; tests inject fixed sequences of unsigned 32-bit integers (0 through 0xffffffff). There is no insecure fallback.

## Independent role selection

- Every single-impostor draw samples the entire roster uniformly, giving each player probability 1/N regardless of position or history. Consecutive selections are valid; no balancing or rotation is enforced.
- Double Trouble draws uniformly without replacement. Each ordered pair has probability 1/(N × (N−1)), so each unordered pair has probability 2/(N × (N−1)). Both impostors still share the same decoy.
- The first clue player is selected independently from the entire roster with a separate draw. A player may be both the impostor and first clue giver.
- Historical impostor and starting counts are retained for information only and do not affect selection.
- Bounded choices use rejection sampling: discard the incomplete tail of the 2^32 range before taking the remainder. This avoids modulo bias. The same sampler chooses among eligible words and decoys.
- Round creation runs only from the guarded Configuration action. React renders, private reveals and shared-screen navigation reuse the saved round and never draw again.

Checkpoints 01–05 are approved and locked. Checkpoint 05 was committed as `8e68341ecfc764109d1b292341d659af30e0f223`. Independent role selection is a separately authorized correction to the former count-balancing policy.

## Words

The offline bank contains 300 distinct majority words: 50 in each of the six concrete categories. Each entry belongs to a curated five-word semantic group, making the other four words eligible Close Call decoys. Each group also names an explicitly reviewed Chaos pool with eight unrelated candidates. Chaos and Double Trouble use those unrelated candidates; both Double Trouble impostors receive the one decoy selected for that round. No Clue never selects or exposes a decoy. Mixed selects from all 300 entries.

Majority entry IDs are excluded until the selected category pool is exhausted. At exhaustion, only that pool's used IDs are cleared, then its full pool becomes eligible again; selecting a concrete category never silently falls through to another category. For Mixed, recycling happens after all 300 entries have been used.

Decoy selection first prefers candidate words not yet used as decoys in the session. If every eligible candidate word has appeared, it prefers majority/mode/decoy pairings not yet used. Once every pairing for that majority and mode has appeared, those pairing records are cleared and the candidate set is recycled. Selection within every eligible set remains cryptographically random. Normalized duplicate candidates and candidates identical to the majority are rejected; an entry with no valid candidate produces an explicit engine error.

## Public clue phase

The shared clue and discussion screen derives one circular speaking order from the saved `startingPlayerId` and the roster's stable IDs. It receives only that public order and the player roster; secret words and roles stay in the private round data. The same shared screen guides the group through verbal clues, questions, discussion, voting and tie defence. No per-player confirmation, assigned question, digital ballot or intermediate phone interaction is required.
