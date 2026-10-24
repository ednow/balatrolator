import { describe, expect, it } from 'vitest'

import { zhPinyin } from '../zh-pinyin.ts'
import { zhTerms } from '../zh-terms.ts'
import { filterOptions, matchScore } from './comboBoxFilter.ts'

describe('zhPinyin', () => {
	it('has an entry for every Chinese term', () => {
		const missing = [...new Set(Object.values(zhTerms))].filter((zh) => zhPinyin[zh] === undefined)
		expect(missing).toEqual([])
	})
})

describe('matchScore', () => {
	it('matches English joker names', () => {
		expect(matchScore('Campfire', 'camp')).toBeGreaterThan(0)
		expect(matchScore('Campfire', 'fire')).toBeGreaterThan(0)
	})

	it('matches Chinese names regardless of UI language', () => {
		expect(matchScore('Campfire', '篝火')).toBeGreaterThan(0)
		expect(matchScore('Campfire', '篝')).toBeGreaterThan(0)
	})

	it('matches full pinyin prefixes', () => {
		expect(matchScore('Campfire', 'gou', true)).toBeGreaterThan(0)
		expect(matchScore('Campfire', 'gouhuo', true)).toBeGreaterThan(0)
	})

	it('matches pinyin initials', () => {
		expect(matchScore('Campfire', 'g', true)).toBeGreaterThan(0)
		expect(matchScore('Campfire', 'gh', true)).toBeGreaterThan(0)
	})

	it('matches pinyin initials in order with characters in between', () => {
		expect(matchScore('Smiley Face', 'wb', true)).toBeGreaterThan(0)
		expect(matchScore('Smiley Face', 'wq', true)).toBeGreaterThan(0)
		expect(matchScore('Smiley Face', 'bq', true)).toBeGreaterThan(0)
		expect(matchScore('Smiley Face', 'bw', true)).toBe(0)
	})

	it('ranks pinyin prefix above suffix above ordered matches', () => {
		const prefix = matchScore('Smiley Face', 'wx', true)
		const suffix = matchScore('Smiley Face', 'bq', true)
		const ordered = matchScore('Smiley Face', 'wb', true)
		expect(prefix).toBeGreaterThan(suffix)
		expect(suffix).toBeGreaterThan(ordered)
	})

	it('matches pinyin with polyphonic characters', () => {
		expect(matchScore('Seeing Double', 'chong', true)).toBeGreaterThan(0)
		expect(matchScore('Seeing Double', 'cy', true)).toBeGreaterThan(0)
	})

	it('matches pinyin for deck and blind names', () => {
		expect(matchScore('Plasma Deck', 'dlzpz', true)).toBeGreaterThan(0)
		expect(matchScore('Big Blind', 'dmz', true)).toBeGreaterThan(0)
	})

	it('only matches pinyin when enabled', () => {
		expect(matchScore('Cerulean Bell', 'w')).toBe(0)
		expect(matchScore('Cerulean Bell', 'w', true)).toBeGreaterThan(0)
	})

	it('does not match unrelated queries', () => {
		expect(matchScore('Campfire', '篝火提示')).toBe(0)
		expect(matchScore('Campfire', 'xyz', true)).toBe(0)
	})
})

describe('filterOptions', () => {
	it('returns all options unchanged for an empty query', () => {
		expect(filterOptions(['Campfire', 'Banner'], '')).toEqual(['Campfire', 'Banner'])
	})

	it('sorts options by match quality', () => {
		expect(filterOptions(['Smiley Face', 'Baseball Card'], 'bq', true)).toEqual(['Baseball Card', 'Smiley Face'])
	})

	it('keeps the original order for equally scored options', () => {
		expect(filterOptions(['Campfire', 'Cerulean Bell'], 'e', true)).toEqual(['Campfire', 'Cerulean Bell'])
	})
})
