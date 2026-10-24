import { describe, expect, test } from 'vitest'

import { doBigMath } from './doBigMath.ts'
import type { ScoreValue } from './types.ts'

const scoreValues: ScoreValue[] = [
	{ chips: ['+', 136], phase: 'base' },
	{ multiplier: ['+', 13], phase: 'base' },
]

describe('doBigMath', () => {
	test('multiplies chips and mult for regular decks', () => {
		const { balanced, score } = doBigMath(scoreValues, 'Red Deck')

		expect(balanced).toBeUndefined()
		expect(score).toBe('1768')
	})

	test('balances chips and mult for the Plasma Deck', () => {
		const { balanced, score } = doBigMath(scoreValues, 'Plasma Deck')

		expect(balanced).toEqual({ chips: '74.5', multiplier: '74.5' })
		expect(score).toBe('5550.25')
	})
})
