import { describe, expect, test } from 'vitest'

import { HANDS } from '#lib/data.ts'
import { getHand } from '#lib/getHand.ts'
import { getCard } from '#lib/getState.ts'
import { getMockHandCards } from './mockHand.ts'

describe('getMockHandCards', () => {
	test.each(HANDS)('provides played cards that form a %s', (handName) => {
		const cards = getMockHandCards(handName).map((initialCard, index) => getCard(initialCard, index))

		expect(cards.every(({ played }) => played)).toBe(true)
		expect(getHand(cards, new Set()).playedHand).toBe(handName)
	})
})
