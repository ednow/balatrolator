import { describe, expect, test } from 'vitest'

import { getJokerSellValue } from './jokerSellValue.ts'

describe('getJokerSellValue', () => {
	test('halves the base cost and rounds down', () => {
		expect(getJokerSellValue({ name: 'Joker', edition: 'Base' })).toBe(1)
		expect(getJokerSellValue({ name: 'Jolly Joker', edition: 'Base' })).toBe(1)
		expect(getJokerSellValue({ name: 'Swashbuckler', edition: 'Base' })).toBe(2)
		expect(getJokerSellValue({ name: 'Blueprint', edition: 'Base' })).toBe(5)
	})

	test('adds the edition cost before halving', () => {
		expect(getJokerSellValue({ name: 'Swashbuckler', edition: 'Foil' })).toBe(3)
		expect(getJokerSellValue({ name: 'Swashbuckler', edition: 'Holographic' })).toBe(3)
		expect(getJokerSellValue({ name: 'Swashbuckler', edition: 'Polychrome' })).toBe(4)
		expect(getJokerSellValue({ name: 'Swashbuckler', edition: 'Negative' })).toBe(4)
		expect(getJokerSellValue({ name: 'Pareidolia', edition: 'Polychrome' })).toBe(5)
		expect(getJokerSellValue({ name: 'Blueprint', edition: 'Negative' })).toBe(7)
	})

	test('sells for at least one dollar', () => {
		expect(getJokerSellValue({ name: 'Credit Card', edition: 'Base' })).toBe(1)
	})
})
