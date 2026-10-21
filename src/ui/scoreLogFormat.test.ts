import { describe, expect, test } from 'vitest'

import { getCard } from '#lib/getState.ts'

import { t, term } from './i18n.ts'
import { formatCardLabel, renderScoreLog } from './scoreLogFormat.ts'

function renderLog (logs: string[][]) {
	const container = document.createElement('div')
	container.append(renderScoreLog(logs.map((log) => ({ log }))))
	return container
}

describe('renderScoreLog', () => {
	test('separates the phase label and colors chips and mult', () => {
		const line = `${t('logPhaseBase')}: ( 5×1 ) ${t('logChips')} +5 ${t('logMult')}  +1`
		const container = renderLog([[line]])

		expect(container.querySelector('.log__phase')?.textContent).toBe(`${t('logPhaseBase')}:`)
		expect(container.querySelectorAll('.log__chips')).toHaveLength(2)
		expect(container.querySelectorAll('.log__mult')).toHaveLength(2)
		expect([...container.querySelectorAll('.log__chips')].map((element) => element.textContent)).toEqual([
			'5',
			`${t('logChips')}  +5`,
		])
		expect([...container.querySelectorAll('.log__mult')].map((element) => element.textContent)).toEqual([
			'1',
			`${t('logMult')}  +1`,
		])
	})

	test('separates multiple logs', () => {
		const line = `${t('logPhaseBase')}: ( 5×1 ) ${t('logChips')} +5`
		const container = renderLog([[line], [line]])

		expect(container.querySelectorAll('.log__line')).toHaveLength(2)
		expect(container.querySelectorAll('.log__separator')).toHaveLength(1)
	})

	test('adds a suit symbol and colors the card label by suit', () => {
		const card = getCard({ rank: 'King', suit: 'Hearts' })
		const label = formatCardLabel(card)

		expect(label).toBe(`K${t('of')}♥`)

		const line = `${t('logPhasePlayedCards')}: ( 80×27 ) ${t('logChips')} +10 ${label}${t('logTypeJoin')}${t('logTypeRank')}`
		const container = renderLog([[line]])
		const cardElement = container.querySelector('.log__card')

		expect(cardElement?.textContent).toBe(label)
		expect(cardElement?.classList.contains('log__suit-hearts')).toBe(true)
	})

	test('uses only the seal color as the seal label', () => {
		const card = getCard({ rank: 'Ace', suit: 'Clubs', seal: 'Red' })

		expect(formatCardLabel(card)).toBe(`A${t('of')}♣ (红色)`)
	})

	test('puts the change and the effect details in their own columns', () => {
		const line = `${t('logPhaseBase')}: ( 5×1 ) ${t('logChips')} +5`
		const container = renderLog([[line]])

		expect(container.querySelector('.log__score')?.textContent).toBe('( 5×1 )')
		expect(container.querySelector('.log__delta')?.textContent).toBe(`${t('logChips')}  +5`)
		expect(container.querySelector('.log__value')?.textContent).toBe('')
	})

	test('keeps the effect details out of the change column', () => {
		const line = `${t('logPhasePlayedCards')}: ( 80×27 ) ${t('logChips')} +10 A·♣ (钢铁牌)${t('logTypeJoin')}${t('logTypeRank')}`
		const container = renderLog([[line]])

		expect(container.querySelector('.log__delta .log__chips')?.textContent).toBe(`${t('logChips')}  +10`)
		expect(container.querySelector('.log__value')?.textContent).toBe(
			`A${t('of')}♣ (钢铁牌)${t('logTypeJoin')}${t('logTypeRank')}`,
		)
	})

	test('translates seal triggers', () => {
		expect(term('Red Seal')).toBe('红色蜡封')
	})

	test('shows the disabled joker of a section before its lines', () => {
		const line = `${t('logPhaseBase')}: ( 5×1 ) ${t('logChips')} +5`
		const container = document.createElement('div')
		container.append(renderScoreLog([{ log: [line], disabledJokerName: 'Constellation' }]))

		const disabledLine = container.querySelector('.log__line--disabled')
		expect(disabledLine?.textContent).toBe(`${t('logDisabledJoker')}${term('Constellation')}`)
		expect(container.querySelectorAll('.log__line')).toHaveLength(2)
	})
})
