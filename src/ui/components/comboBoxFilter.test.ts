import { describe, expect, it } from 'vitest'

import { matchesOption } from './comboBoxFilter.ts'

describe('matchesOption', () => {
	it('matches English joker names', () => {
		expect(matchesOption('Campfire', 'camp')).toBe(true)
		expect(matchesOption('Campfire', 'fire')).toBe(true)
	})

	it('matches Chinese names regardless of UI language', () => {
		expect(matchesOption('Campfire', '篝火')).toBe(true)
		expect(matchesOption('Campfire', '篝')).toBe(true)
	})

	it('does not match unrelated queries', () => {
		expect(matchesOption('Campfire', '篝火提示')).toBe(false)
	})
})
