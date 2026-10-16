import { createServer } from 'vite'

// Synthetic fixtures only. --trace prints synthetic IDs by round for audits.
// This standalone harness is never imported by the application; never pass live session data.
// Run manually with: node scripts/diagnose-role-randomness.mjs [--trace]
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
    const trace = []
    let consecutiveRepeatCount = 0
    let starterAlsoImpostorCount = 0
    let history = createAssignmentHistory()

    for (let index = 0; index < roundCount; index += 1) {
      const result = createRound(players, { ...DEFAULT_GAME_SETTINGS, mode }, history)
      consecutiveRepeatCount += result.round.impostorIds.filter((id) => history.previousImpostorIds.includes(id)).length
      if (result.round.impostorIds.includes(result.round.startingPlayerId)) starterAlsoImpostorCount++
      if (process.argv.includes('--trace') && index < 10) {
        trace.push({ roundNumber: result.round.roundNumber, impostorIds: result.round.impostorIds, startingPlayerId: result.round.startingPlayerId })
      }
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
      policy: 'uniform among eligible players, excluding the previous round',
      expectedLongRunImpostorFrequency: (mode === 'double-trouble' ? 2 : 1) / playerCount,
      consecutiveRepeatCount,
      starterAlsoImpostorCount,
      ...(trace.length ? { syntheticTrace: trace } : {}),
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
