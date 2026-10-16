import { createServer } from 'vite'

// Synthetic sessions only. Print aggregate frequencies, never individual roles or words.
// Run manually with: node scripts/diagnose-role-randomness.mjs
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: 'custom',
})

try {
  const { createRound, createAssignmentHistory } = await server.ssrLoadModule('/src/game/round.ts')
  const { DEFAULT_GAME_SETTINGS } = await server.ssrLoadModule('/src/game/settings.ts')
  const results = []

  for (const { playerCount, mode } of [
    { playerCount: 3, mode: 'chaos' },
    { playerCount: 12, mode: 'chaos' },
    { playerCount: 6, mode: 'double-trouble' },
  ]) {
    const players = Array.from({ length: playerCount }, (_, index) => ({
      id: `synthetic-${index + 1}`,
      name: `Synthetic ${index + 1}`,
    }))
    const roundCount = 30_000
    const pairCounts = new Map()
    let history = createAssignmentHistory()

    for (let index = 0; index < roundCount; index += 1) {
      const result = createRound(players, { ...DEFAULT_GAME_SETTINGS, mode }, history)
      history = result.history

      if (mode === 'double-trouble') {
        const key = [...result.round.impostorIds].sort().join(',')
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }

    results.push({
      playerCount,
      mode,
      roundCount,
      expectedImpostorProbability: (mode === 'double-trouble' ? 2 : 1) / playerCount,
      players: players.map((player, index) => ({
        position: index + 1,
        impostorCount: history.impostorTurns[player.id] ?? 0,
        starterCount: history.startingTurns[player.id] ?? 0,
      })),
      ...(mode === 'double-trouble' ? {
        distinctPairs: pairCounts.size,
        minimumPairCount: Math.min(...pairCounts.values()),
        maximumPairCount: Math.max(...pairCounts.values()),
      } : {}),
    })
  }

  console.log(JSON.stringify(results, null, 2))
} finally {
  await server.close()
}
