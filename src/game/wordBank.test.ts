import { describe, expect, it } from 'vitest'
import {
  getWordPool,
  normaliseWord,
  WORD_BANK,
  WORD_GROUPS,
  type WordCategory,
} from './wordBank'

const CATEGORIES: readonly WordCategory[] = [
  'everyday-things',
  'food-and-drink',
  'places',
  'animals-and-nature',
  'activities',
  'entertainment',
]

describe('word bank dataset', () => {
  it('contains 300 distinct majority entries distributed evenly across categories', () => {
    expect(WORD_BANK).toHaveLength(300)
    expect(getWordPool('mixed')).toEqual(WORD_BANK)

    for (const category of CATEGORIES) {
      expect(getWordPool(category)).toHaveLength(50)
    }
  })

  it('has no ID or normalized majority-word collisions', () => {
    const ids = WORD_BANK.map((entry) => entry.id)
    const normalizedWords = WORD_BANK.map((entry) => normaliseWord(entry.majority))

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(normalizedWords).size).toBe(normalizedWords.length)
    expect(normalizedWords.every(Boolean)).toBe(true)
  })

  it('builds each semantic group into five majority entries with four related alternatives', () => {
    expect(WORD_GROUPS).toHaveLength(60)

    for (const group of WORD_GROUPS) {
      const entries = WORD_BANK.filter((entry) => entry.semanticGroupId === group.id)
      const groupWords = new Set(group.words.map(normaliseWord))

      expect(entries).toHaveLength(5)
      expect(new Set(entries.map((entry) => normaliseWord(entry.majority)))).toEqual(groupWords)

      for (const entry of entries) {
        const related = entry.relatedDecoys.map(normaliseWord)
        expect(related).toHaveLength(4)
        expect(new Set(related).size).toBe(4)
        expect(related).not.toContain(normaliseWord(entry.majority))
        expect(related.every((word) => groupWords.has(word))).toBe(true)
      }
    }
  })

  it('provides at least six distinct unrelated Chaos candidates for every entry', () => {
    const majorityWords = new Set(WORD_BANK.map((entry) => normaliseWord(entry.majority)))

    for (const entry of WORD_BANK) {
      const majority = normaliseWord(entry.majority)
      const related = new Set(entry.relatedDecoys.map(normaliseWord))
      const chaos = entry.chaosDecoys.map(normaliseWord)

      expect(chaos.length).toBeGreaterThanOrEqual(6)
      expect(new Set(chaos).size).toBe(chaos.length)
      expect(chaos).not.toContain(majority)
      expect(chaos.every((word) => !related.has(word))).toBe(true)
      expect(chaos.every(Boolean)).toBe(true)

      // A chaos candidate can appear as a majority elsewhere only after deliberate review.
      expect(chaos.filter((word) => majorityWords.has(word))).toEqual([])
    }
  })

  it('keeps representative Close Call and Chaos associations semantically intentional', () => {
    const expected = [
      ['Umbrella', 'Raincoat', 'Microscope'],
      ['Coffee', 'Tea', 'Tower Crane'],
      ['Airport', 'Train Station', 'Watering Can'],
      ['Lion', 'Tiger', 'Keyboard'],
      ['Running', 'Cycling', 'Crown'],
      ['Comedy Film', 'Horror Film', 'Tractor'],
    ] as const

    for (const [majority, related, chaos] of expected) {
      const entry = WORD_BANK.find((candidate) => candidate.majority === majority)
      expect(entry?.relatedDecoys).toContain(related)
      expect(entry?.chaosDecoys).toContain(chaos)
    }
  })
})
