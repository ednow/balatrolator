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
			valueStr += ` ${strings.chips} ${operator}${value}`
		}
	}

	if (multiplier) {
		const [operator, value] = multiplier
		if (!(operator === '*' && value === 1 || operator === '+' && value === 0)) {
			valueStr += ` ${strings.mult}  ${operator}${value}`
		}
	}

	if (valueStr === '') {
		return ''
	}

	const prefix = `${phaseLabel}:`
	let str = `${prefix.padEnd(13)}${valueStr}`
	if (joker) {
		const jokerLabel = options?.formatJoker?.(joker) ?? String(joker)
		str += ` ${strings.from} ${jokerLabel}`

		if (card) {
			const cardLabel = options?.formatCard?.(card) ?? String(card)
			str += ` ${strings.for} ${cardLabel}`
		}
	} else if (card) {
		const cardLabel = options?.formatCard?.(card) ?? String(card)
		str += ` ${strings.from} ${cardLabel}`
	}

	if (type) {
		const typeLabel = options?.formatScoreType?.(type) ?? type
		str += `${strings.typeJoin}${typeLabel}`
	}
	if (trigger && trigger !== 'Regular') {
		const triggerLabel = options?.formatTrigger?.(trigger) ?? trigger
		str += ` (${strings.trigger}: ${triggerLabel})`
	}

	return str + ` → ${currentScoreValue.chips}×${currentScoreValue.multiplier}`
}
