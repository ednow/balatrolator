import { describe, expect, test } from 'vitest'

import { formatScoreValue } from './formatScoreValue.ts'

describe('formatScoreValue', () => {
	test('rounds the running score shown in the log', () => {
		const line = formatScoreValue(
			{ multiplier: ['*', 1.5], phase: 'jokers' },
			{ chips: '250', multiplier: '7415.82421875' },
		)

		expect(line).toBe('jokers: ( 250×7416 ) mult  ×1.5')
	})
})
