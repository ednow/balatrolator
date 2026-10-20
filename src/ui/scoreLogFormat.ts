import { RANKS } from '#lib/data.ts'
import { formatScoreValue } from '#lib/formatScoreValue.ts'
import type { Card, Joker, ScoreValue, Suit } from '#lib/types.ts'

import { getLang, t, term, termEdition, termEnhancement, termSealColor, type UiKey } from './i18n.ts'

const SUIT_SYMBOLS: Record<Suit, string> = {
	Clubs: '♣',
	Spades: '♠',
	Hearts: '♥',
	Diamonds: '♦',
}

const SUIT_CLASSES: Record<string, string> = {
	'♣': 'log__suit-clubs',
	'♠': 'log__suit-spades',
	'♥': 'log__suit-hearts',
	'♦': 'log__suit-diamonds',
}

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
		card.seal !== 'None' ? formatSealLabel(card.seal) : undefined,
	].filter((modifier) => modifier !== undefined)
	const suffix = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : ''
	const suitLabel = getLang() === 'en' ? term(card.suit) : SUIT_SYMBOLS[card.suit]
	return `${term(card.rank)}${t('of')}${suitLabel}${suffix}`
}

function formatSealLabel (seal: string): string {
	return termSealColor(seal)
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
			from: '',
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

const NUMBER_PATTERN = String.raw`\d+(?:\.\d+)?(?:e[+-]?\d+)?`

function escapeRegExp (value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createLogSpan (className: string, text: string): HTMLSpanElement {
	const span = document.createElement('span')
	span.className = className
	span.textContent = text
	return span
}

/**
 * Matches a localized card label, e.g. “K·♥”, so it can be colored by suit.
 */
function getCardLabelPattern (): string {
	const rankNames = RANKS.map((rank) => escapeRegExp(term(rank))).join('|')
	return `(?:${rankNames})${escapeRegExp(t('of'))}[${Object.values(SUIT_SYMBOLS).join('')}]`
}

/**
 * Appends text to `container`, wrapping chips, mult, and card labels in colored spans.
 */
function appendColoredValues (container: Node, text: string) {
	const chipsLabel = escapeRegExp(t('logChips'))
	const multLabel = escapeRegExp(t('logMult'))
	const tokenPattern = new RegExp(
		`(?<chips>${chipsLabel}\\s+[+*×]\\s*${NUMBER_PATTERN})`
		+ `|(?<mult>${multLabel}\\s+[+*×]\\s*${NUMBER_PATTERN})`
		+ `|(?<card>${getCardLabelPattern()})`,
		'g',
	)

	let lastIndex = 0
	for (const match of text.matchAll(tokenPattern)) {
		const matchIndex = match.index ?? 0
		if (matchIndex > lastIndex) {
			container.appendChild(document.createTextNode(text.slice(lastIndex, matchIndex)))
		}

		const groups = match.groups!
		if (groups.card) {
			container.appendChild(createLogSpan(`log__card ${SUIT_CLASSES[match[0].slice(-1)]}`, match[0]))
		} else {
			container.appendChild(createLogSpan(groups.chips ? 'log__chips' : 'log__mult', match[0]))
		}
		lastIndex = matchIndex + match[0].length
	}

	if (lastIndex < text.length) {
		container.appendChild(document.createTextNode(text.slice(lastIndex)))
	}
}

function appendEquation (container: HTMLElement, text: string): string {
	const equationPattern = new RegExp(`^\\(\\s*(${NUMBER_PATTERN})\\s*×\\s*(${NUMBER_PATTERN})\\s*\\)\\s*`)
	const equation = text.match(equationPattern)
	if (equation === null) {
		return text
	}

	container.appendChild(document.createTextNode('( '))
	container.appendChild(createLogSpan('log__chips', equation[1]!))
	container.appendChild(document.createTextNode('×'))
	container.appendChild(createLogSpan('log__mult', equation[2]!))
	container.appendChild(document.createTextNode(' )'))
	return text.slice(equation[0].length)
}

/**
 * Splits a leading “chips +50” / “mult ×1.5” change off the effect text so it can occupy its own column.
 */
function takeChange (text: string, label: string): { text: string, rest: string } | undefined {
	const changePattern = new RegExp(`^\\s*${escapeRegExp(label)}\\s+([+*×])\\s*(${NUMBER_PATTERN})`)
	const change = text.match(changePattern)
	if (change === null) {
		return undefined
	}

	return {
		text: `${label}  ${change[1]}${change[2]}`,
		rest: text.slice(change[0].length),
	}
}

function renderScoreLogLine (line: string): HTMLDivElement {
	const element = document.createElement('div')
	element.className = 'log__line'

	const phaseMatch = line.match(/^([^:]+):\s*(.*)$/s)
	const phase = createLogSpan('log__phase', phaseMatch ? `${phaseMatch[1]}:` : '')
	const score = createLogSpan('log__score', '')
	const delta = createLogSpan('log__delta', '')
	const detail = createLogSpan('log__value', '')

	const text = phaseMatch ? phaseMatch[2]! : line
	let rest = appendEquation(score, text)

	const chips = takeChange(rest, t('logChips'))
	if (chips) {
		delta.append(createLogSpan('log__chips', chips.text))
		rest = chips.rest
	}

	const mult = takeChange(rest, t('logMult'))
	if (mult) {
		if (delta.childNodes.length > 0) {
			delta.append(document.createTextNode(' '))
		}
		delta.append(createLogSpan('log__mult', mult.text))
		rest = mult.rest
	}

	appendColoredValues(detail, rest.trimStart())
	element.append(phase, score, delta, detail)

	return element
}

/**
 * Renders one or more logs (one per luck value) into structured, color-coded lines.
 */
export function renderScoreLog (logs: readonly string[][]): DocumentFragment {
	const fragment = document.createDocumentFragment()

	logs.forEach((log, logIndex) => {
		if (logIndex > 0) {
			const separator = document.createElement('div')
			separator.className = 'log__separator'
			fragment.append(separator)
		}

		for (const line of log) {
			fragment.append(renderScoreLogLine(line))
		}
	})

	return fragment
}
