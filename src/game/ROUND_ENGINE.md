# Round engine notes

The engine keeps role assignment and word selection outside React. `createRound` accepts the current players, validated settings, session history and an injectable random source. Production calls use `crypto.getRandomValues`; tests inject fixed sequences.

## Fairness

- Impostors are chosen from the players with the fewest previous impostor turns. Random choice within that least-assigned tier prevents a fixed rotation. Double Trouble repeats this process without replacement, so the two IDs are always distinct.
- The first clue player is chosen independently using a separate count map and a separate random draw. A player may legitimately be both the impostor and first clue giver.
- This is count-balancing, not a guarantee about short-term ordering. With equal counts, cryptographic randomness may select a recently used player.

## Words

The initial bank contains ten hand-curated entries for each concrete category. Every entry has one majority word, a related Close Call decoy and an unrelated Chaos/Double Trouble decoy. Mixed selects across all concrete categories. Used majority entry IDs are excluded for the session; an exhausted requested pool returns an explicit error instead of repeating a word or changing category.

This is a checkpoint-sized starter dataset, not the final production word library. Relationship quality should receive ongoing editorial review as the library grows.

## Public clue phase

The shared clue and discussion screen derives one circular speaking order from the saved `startingPlayerId` and the roster's stable IDs. It receives only that public order and the player roster; secret words and roles stay in the private round data. No per-clue interaction or progression state is required while the group talks aloud.
