import { formatScoreValue } from '#lib/formatScoreValue.ts'
import type { Card, Joker, ScoreValue } from '#lib/types.ts'

import { getLang, t, term, termEdition, termEnhancement, termSeal, type UiKey } from './i18n.ts'

const phaseKey: Record<ScoreValue['phase'], UiKey> = {
	base: 'logPhaseBase',
	'played-cards': 'logPhasePlayedCards',
	'held-cards': 'logPhaseHeldCards',
	jokers: 'logPhaseJokers',
	consumables: 'logPhaseConsumables',
	balancing: 'logPhaseBalancing',
}

export function formatJokerLabel (joker: Joker): string {
	const modifiers = joker.edition !== 'Base' ? [termEdition(joker.edition)] : []
	const suffix = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : ''
	return `${term(joker.name)}${suffix}`
}

export function formatCardLabel (card: Card): string {
	const modifiers = [
		card.edition !== 'Base' ? termEdition(card.edition) : undefined,
		card.enhancement !== 'None' ? termEnhancement(card.enhancement) : undefined,
		card.seal !== 'None' ? termSeal(card.seal) : undefined,
	].filter((modifier) => modifier !== undefined)
	const suffix = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : ''
	return `${term(card.rank)}${t('of')}${term(card.suit)}${suffix}`
}

const scoreTypeKey = {
	rank: 'logTypeRank',
	enhancement: 'logTypeEnhancement',
	edition: 'logTypeEdition',
} as const

function localizedOptions () {
	return {
		formatPhase: (phase: ScoreValue['phase']) => t(phaseKey[phase]),
		formatJoker: formatJokerLabel,
		formatCard: formatCardLabel,
		formatScoreType: (type: NonNullable<ScoreValue['type']>) => t(scoreTypeKey[type]),
		formatTrigger: (trigger: string) => term(trigger),
		strings: {
			chips: t('logChips'),
			mult: t('logMult'),
			from: t('logFrom'),
			for: t('logFor'),
			trigger: t('logTrigger'),
			typeJoin: t('logTypeJoin'),
		},
	}
}

export function formatScoreValueForUi (
	scoreValue: ScoreValue,
	currentScoreValue: { chips: string, multiplier: string },
): string {
	if (getLang() === 'en') {
		return formatScoreValue(scoreValue, currentScoreValue)
	}

	return formatScoreValue(scoreValue, currentScoreValue, localizedOptions())
}
