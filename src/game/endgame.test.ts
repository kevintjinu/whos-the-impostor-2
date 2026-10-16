import { describe, expect, it } from 'vitest'
import {
  getPublicEndgame,
  initialEndgame,
  lockAndRevealAccusation,
  recordFinalGuess,
} from './endgame'
import { createAssignmentHistory, createRound } from './round'
import { DEFAULT_GAME_SETTINGS, type GameMode } from './settings'

const players = Array.from({ length: 6 }, (_, index) => ({ id: `p${index}`, name: `Player ${index}` }))
function round(mode: GameMode = 'chaos') {
  return createRound(players, { ...DEFAULT_GAME_SETTINGS, mode }, createAssignmentHistory(), () => 0).round
}

describe('lock and reveal', () => {
  it.each(['chaos', 'close-call', 'no-clue', 'double-trouble'] as const)(
    'requires a complete accusation before revealing %s', (mode) => {
      const current = round(mode)
      const initial = initialEndgame()
      expect(getPublicEndgame(initial, current)).toEqual({ phase: 'accusation' })
      expect(() => lockAndRevealAccusation(initial, current, players.map(({ id }) => id), []))
        .toThrow()
      const pending = lockAndRevealAccusation(initial, current, players.map(({ id }) => id), current.impostorIds)
      expect(pending.phase).toBe('final-guess')
      const view = getPublicEndgame(pending, current)
      expect(view).toEqual({
        phase: 'final-guess',
        accusedPlayerIds: current.impostorIds,
        impostorIds: current.impostorIds,
      })
      expect(JSON.stringify(view)).not.toContain(current.majorityWord)
      if (current.decoyWord) expect(JSON.stringify(view)).not.toContain(current.decoyWord)
      expect(JSON.stringify(view)).not.toMatch(/word|privateRoles|instruction/)
      expect(() => lockAndRevealAccusation(pending, current, players.map(({ id }) => id), current.impostorIds))
        .toThrow('already locked')
    },
  )

  it('ends an incorrect accusation immediately and reveals the answers', () => {
    const current = round()
    const result = lockAndRevealAccusation(initialEndgame(), current, players.map(({ id }) => id), ['p5'])
    expect(result).toMatchObject({
      phase: 'completed',
      result: { winner: 'impostors', accusationCorrect: false, finalGuess: 'not-needed', majorityWord: current.majorityWord },
    })
    expect(() => recordFinalGuess(result, current, true)).toThrow()
  })

  it('requires both Double Trouble impostors, independent of selection order', () => {
    const current = round('double-trouble')
    const ids = players.map(({ id }) => id)
    const partial = lockAndRevealAccusation(initialEndgame(), current, ids, [current.impostorIds[0], 'p5'])
    expect(partial).toMatchObject({ phase: 'completed', result: { winner: 'impostors', accusationCorrect: false } })
    const correct = lockAndRevealAccusation(initialEndgame(), current, ids, [...current.impostorIds].reverse())
    expect(correct.phase).toBe('final-guess')
  })

  it.each([true, false])('records the verbal judgement %s once and reveals answers', (correct) => {
    const current = round()
    const pending = lockAndRevealAccusation(initialEndgame(), current, players.map(({ id }) => id), current.impostorIds)
    const completed = recordFinalGuess(pending, current, correct)
    expect(completed).toMatchObject({
      phase: 'completed',
      result: {
        winner: correct ? 'impostors' : 'majority',
        finalGuess: correct ? 'correct' : 'incorrect',
        accusationCorrect: true,
        majorityWord: current.majorityWord,
        decoyWord: current.decoyWord,
      },
    })
    expect(() => recordFinalGuess(completed, current, !correct)).toThrow()
    expect(() => recordFinalGuess(initialEndgame(), current, correct)).toThrow()
  })

  it('does not add a decoy in No Clue results', () => {
    const current = round('no-clue')
    expect(lockAndRevealAccusation(initialEndgame(), current, players.map(({ id }) => id), ['p5']))
      .toMatchObject({ phase: 'completed', result: { decoyWord: null } })
  })

  it('rejects a judgement from a different round', () => {
    const current = round()
    const pending = lockAndRevealAccusation(initialEndgame(), current, players.map(({ id }) => id), current.impostorIds)
    expect(() => recordFinalGuess(pending, { ...current, roundNumber: current.roundNumber + 1 }, true)).toThrow('same round')
  })
})
