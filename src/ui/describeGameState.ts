import { HANDS, JOKER_DEFINITIONS } from '#lib/data.ts'
import type { HandName, Joker, Result, State } from '#lib/types.ts'

import { getLang, t, term } from './i18n.ts'
import { formatCardLabel, formatJokerLabel } from './scoreLogFormat.ts'

function sectionTitle (key: 'describeSectionRound' | 'describeSectionObservatory' | 'describeSectionLevels' | 'describeSectionJokers' | 'describeSectionCards' | 'describeSectionScore'): string {
	const label = t(key)
	return getLang() === 'zh' ? `【${label}】` : `[${label}]`
}

function describeJokerExtras (joker: Joker): string {
	const definition = JOKER_DEFINITIONS[joker.name]
	const parts: string[] = []
	if (joker.count > 1) {
		parts.push(`${t('count')}×${joker.count}`)
	}

	if (definition.hasPlusChipsInput && joker.plusChips !== 0) {
		parts.push(`${t('plusChips')} ${joker.plusChips}`)
	}

	if (definition.hasPlusMultiplierInput && joker.plusMultiplier !== 0) {
		parts.push(`${t('plusMult')} ${joker.plusMultiplier}`)
	}

	if (definition.hasTimesMultiplierInput && joker.timesMultiplier !== 1) {
		parts.push(`${t('timesMult')} ${joker.timesMultiplier}`)
	}

	if (definition.hasRankInput && joker.rank !== undefined) {
		parts.push(`${t('rank')}: ${term(joker.rank)}`)
	}

	if (definition.hasSuitInput && joker.suit !== undefined) {
		parts.push(`${t('suit')}: ${term(joker.suit)}`)
	}

	if (definition.hasIsActiveInput && !joker.active) {
		parts.push(t('describeInactive'))
	}

	return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

function luckScoreLine (luck: Result['luck'], formattedScore: string): string {
	if (luck === 'none') {
		return `${t('luckNone')}: ${formattedScore}`
	}

	if (luck === 'all') {
		return `${t('luckAll')}: ${formattedScore}`
	}

	return `${t('luckAverage')}: ${formattedScore}`
}

export function describeGameState (
	state: State,
	hand?: HandName,
	results?: Result[],
): string {
	const lines: string[] = [t('describeTitle'), '']

	lines.push(sectionTitle('describeSectionRound'))
	const blindStatus = state.blind.active ? t('blindActive') : t('describeBlindInactive')
	lines.push(`${t('hands')}: ${state.hands}`)
	lines.push(`${t('discards')}: ${state.discards}`)
	lines.push(`${t('money')}: ${state.money}`)
	lines.push(`${t('blind')}: ${term(state.blind.name)} (${blindStatus})`)
	lines.push(`${t('deck')}: ${term(state.deck)}`)
	lines.push(`${t('jokerSlots')}: ${state.jokerSlots}`)
	lines.push('')

	const observatoryLines = HANDS
		.map((handName) => [handName, state.observatory[handName]] as const)
		.filter(([, value]) => value > 0)
	if (observatoryLines.length > 0) {
		lines.push(sectionTitle('describeSectionObservatory'))
		for (const [handName, value] of observatoryLines) {
			lines.push(`${term(handName)}: ${value}`)
		}

		lines.push('')
	}

	const levelLines = HANDS
		.map((handName) => {
			const { level, plays } = state.handLevels[handName]
			if (level === 1 && plays === 0) {
				return undefined
			}

			return `${term(handName)} — ${t('levelShort')} ${level}, ${t('playsShort')} ${plays}`
		})
		.filter((line) => line !== undefined)

	if (levelLines.length > 0) {
		lines.push(sectionTitle('describeSectionLevels'))
		lines.push(...levelLines)
		lines.push('')
	}

	lines.push(sectionTitle('describeSectionJokers'))
	if (state.jokers.length === 0) {
		lines.push(t('describeNoJokers'))
	} else {
		for (const [index, joker] of state.jokers.entries()) {
			lines.push(`${index + 1}. ${formatJokerLabel(joker)}${describeJokerExtras(joker)}`)
		}
	}

	lines.push('')
	lines.push(sectionTitle('describeSectionCards'))
	if (state.cards.length === 0) {
		lines.push(t('describeNoCards'))
	} else {
		for (const [index, card] of state.cards.entries()) {
			const status = card.played ? t('describeCardPlayed') : t('describeCardHeld')
			const debuffed = card.debuffed ? ` (${t('describeDebuffed')})` : ''
			lines.push(`${index + 1}. ${formatCardLabel(card)} — ${status}${debuffed}`)
		}
	}

	if (hand !== undefined && results !== undefined && results.length > 0) {
		lines.push('')
		lines.push(sectionTitle('describeSectionScore'))
		lines.push(`${t('playedHand')}${term(hand)}`)
		for (const result of results) {
			lines.push(luckScoreLine(result.luck, result.formattedScore))
		}
	}

	return lines.join('\n').trimEnd()
}
