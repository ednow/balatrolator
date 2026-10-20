import { Decimal } from 'decimal.js'

import type { Card, Joker, ScoreValue } from '#lib/types.ts'

export interface FormatScoreValueOptions {
	formatPhase?: (phase: ScoreValue['phase']) => string
	formatJoker?: (joker: Joker) => string
	formatCard?: (card: Card) => string
	formatScoreType?: (type: NonNullable<ScoreValue['type']>) => string
	formatTrigger?: (trigger: string) => string
	strings?: {
		chips: string
		mult: string
		from: string
		for: string
		trigger: string
		typeJoin: string
	}
}

const defaultStrings = {
	chips: 'chips',
	mult: 'mult',
	from: 'from',
	for: 'for',
	trigger: 'trigger',
	typeJoin: '\'s ',
}

function roundForLog (value: string): string {
	return new Decimal(value).round().toString()
}

function formatOperator (operator: '+' | '*'): string {
	return operator === '*' ? '×' : operator
}

export function formatScoreValue (
	{ chips, multiplier, phase, card, joker, type, trigger }: ScoreValue,
	currentScoreValue: { chips: string, multiplier: string },
	options?: FormatScoreValueOptions,
): string {
	const strings = { ...defaultStrings, ...options?.strings }
	const phaseLabel = options?.formatPhase?.(phase) ?? phase

	let valueStr = ''
	if (chips) {
		const [operator, value] = chips
		if (!(operator === '*' && value === 1 || operator === '+' && value === 0)) {
			valueStr += ` ${strings.chips}  ${formatOperator(operator)}${value}`
		}
	}

	if (multiplier) {
		const [operator, value] = multiplier
		if (!(operator === '*' && value === 1 || operator === '+' && value === 0)) {
			valueStr += ` ${strings.mult}  ${formatOperator(operator)}${value}`
		}
	}

	if (valueStr === '') {
		return ''
	}

	let str = `${phaseLabel}: ( ${roundForLog(currentScoreValue.chips)}×${roundForLog(currentScoreValue.multiplier)} )${valueStr}`
	const fromPrefix = strings.from === '' ? '' : `${strings.from} `
	if (joker) {
		const jokerLabel = options?.formatJoker?.(joker) ?? String(joker)
		str += ` ${fromPrefix}${jokerLabel}`

		if (card) {
			const cardLabel = options?.formatCard?.(card) ?? String(card)
			str += ` ${strings.for} ${cardLabel}`
		}
	} else if (card) {
		const cardLabel = options?.formatCard?.(card) ?? String(card)
		str += ` ${fromPrefix}${cardLabel}`
	}

	if (type) {
		const typeLabel = options?.formatScoreType?.(type) ?? type
		str += `${strings.typeJoin}${typeLabel}`
	}
	if (trigger && trigger !== 'Regular') {
		const triggerLabel = options?.formatTrigger?.(trigger) ?? trigger
		str += ` (${strings.trigger}: ${triggerLabel})`
	}

	return str
}
