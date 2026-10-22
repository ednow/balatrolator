import { describe, expect, it } from 'vitest'

import { zhPinyin } from '../zh-pinyin.ts'
import { zhTerms } from '../zh-terms.ts'
import { matchesOption } from './comboBoxFilter.ts'

describe('zhPinyin', () => {
	it('has an entry for every Chinese term', () => {
		const missing = [...new Set(Object.values(zhTerms))].filter((zh) => zhPinyin[zh] === undefined)
		expect(missing).toEqual([])
	})
})

describe('matchesOption', () => {
	it('matches English joker names', () => {
		expect(matchesOption('Campfire', 'camp')).toBe(true)
		expect(matchesOption('Campfire', 'fire')).toBe(true)
	})

	it('matches Chinese names regardless of UI language', () => {
		expect(matchesOption('Campfire', '篝火')).toBe(true)
		expect(matchesOption('Campfire', '篝')).toBe(true)
	})

	it('matches full pinyin prefixes', () => {
		expect(matchesOption('Campfire', 'gou')).toBe(true)
		expect(matchesOption('Campfire', 'gouhuo')).toBe(true)
	})

	it('matches pinyin initials', () => {
		expect(matchesOption('Campfire', 'g')).toBe(true)
		expect(matchesOption('Campfire', 'gh')).toBe(true)
	})

	it('matches pinyin with polyphonic characters', () => {
		expect(matchesOption('Seeing Double', 'chong')).toBe(true)
		expect(matchesOption('Seeing Double', 'cy')).toBe(true)
	})

	it('does not match unrelated queries', () => {
		expect(matchesOption('Campfire', '篝火提示')).toBe(false)
		expect(matchesOption('Campfire', 'huo')).toBe(false)
	})
})
