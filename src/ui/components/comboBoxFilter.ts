import { zhPinyin } from '../zh-pinyin.ts'
import { zhTerms } from '../zh-terms.ts'

const NO_MATCH = 0
const EXACT = 8
const NAME_PREFIX = 7
const NAME_CONTAINS = 6
const PINYIN_PREFIX = 5
const PINYIN_SUFFIX = 4
const PINYIN_CONTAINS = 3
const PINYIN_ORDERED = 2

function isOrderedSubsequence (query: string, text: string) {
	let queryIndex = 0
	for (const char of text) {
		if (char === query[queryIndex]) {
			queryIndex += 1
			if (queryIndex === query.length) {
				return true
			}
		}
	}
	return false
}

/**
 * Scores how well an option matches a query. Higher is better, `0` means no match.
 *
 * Pinyin matches rank by position: prefix, then suffix, then substring, then characters matched in order with other characters in between.
 */
export function matchScore (option: string, query: string, matchPinyin = false) {
	if (query === '') {
		return NAME_PREFIX
	}

	const lowerQuery = query.toLowerCase()

	const name = option.toLowerCase()
	if (name === lowerQuery) {
		return EXACT
	}
	if (name.startsWith(lowerQuery)) {
		return NAME_PREFIX
	}
	if (name.includes(lowerQuery)) {
		return NAME_CONTAINS
	}

	const zh = zhTerms[option]
	if (zh === undefined) {
		return NO_MATCH
	}

	const lowerZh = zh.toLowerCase()
	if (lowerZh === lowerQuery) {
		return EXACT
	}
	if (lowerZh.startsWith(lowerQuery)) {
		return NAME_PREFIX
	}
	if (lowerZh.includes(lowerQuery)) {
		return NAME_CONTAINS
	}

	if (!matchPinyin) {
		return NO_MATCH
	}

	const pinyin = zhPinyin[zh]
	if (pinyin === undefined) {
		return NO_MATCH
	}

	if (pinyin.full.startsWith(lowerQuery) || pinyin.initials.startsWith(lowerQuery)) {
		return PINYIN_PREFIX
	}
	if (pinyin.full.endsWith(lowerQuery) || pinyin.initials.endsWith(lowerQuery)) {
		return PINYIN_SUFFIX
	}
	if (pinyin.full.includes(lowerQuery) || pinyin.initials.includes(lowerQuery)) {
		return PINYIN_CONTAINS
	}
	if (isOrderedSubsequence(lowerQuery, pinyin.initials)) {
		return PINYIN_ORDERED
	}
	return NO_MATCH
}

/**
 * Filters and sorts options by match score, with equally scored options keeping their original order.
 */
export function filterOptions (options: string[], query: string, matchPinyin = false) {
	if (query === '') {
		return [...options]
	}

	return options
		.map((option, index) => ({ option, index, score: matchScore(option, query, matchPinyin) }))
		.filter(({ score }) => score !== NO_MATCH)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map(({ option }) => option)
}
