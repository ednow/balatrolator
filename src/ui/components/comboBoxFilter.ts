import { zhPinyin } from '../zh-pinyin.ts'
import { zhTerms } from '../zh-terms.ts'

export function matchesOption (option: string, query: string) {
	if (query === '') {
		return true
	}

	const lowerQuery = query.toLowerCase()
	if (option.toLowerCase().includes(lowerQuery)) {
		return true
	}

	const zh = zhTerms[option]
	if (zh === undefined) {
		return false
	}

	if (zh.toLowerCase().includes(lowerQuery)) {
		return true
	}

	const pinyin = zhPinyin[zh]
	return pinyin !== undefined
		&& (pinyin.full.startsWith(lowerQuery) || pinyin.initials.startsWith(lowerQuery))
}
