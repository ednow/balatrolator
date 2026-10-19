import { zhTerms } from '../zh-terms.ts'

export function matchesOption (option: string, query: string) {
	if (query === '') {
		return true
	}

	const lowerQuery = query.toLowerCase()
	const zh = zhTerms[option]

	return option.toLowerCase().includes(lowerQuery)
		|| (zh?.toLowerCase().includes(lowerQuery) ?? false)
}
