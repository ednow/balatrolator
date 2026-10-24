import { Decimal } from 'decimal.js'

import { RANK_TO_CHIP_MAP, LUCKS } from './data.ts'
import { balanceMultWithLuck } from './balanceMultWithLuck.ts'
import { formatScore } from './formatScore.ts'
import { isFaceCard, isRank } from './cards.ts'
import { resolveJoker } from './resolveJokers.ts'
import { doBigMath, type ScoreValueFormatter } from './doBigMath.ts'
import { getHand } from './getHand.ts'
import type { Card, HandName, Joker, JokerName, Luck, Result, ScoreValue, State } from './types.ts'

interface Variant {
	state: State
	playedHand: HandName
	scoringCards: Card[]
	disabledJokerName?: JokerName
}

type Score = ReturnType<typeof doBigMath>

export function calculateScore (
	unresolvedState: State,
	options?: { formatScoreValue?: ScoreValueFormatter },
): {
	hand: HandName
	scoringCards: Card[]
	results: Result[]
} {
	// Create copies of jokers and cards based on their count.
	const state = {
		...unresolvedState,
		jokers: unresolvedState.jokers.flatMap((joker) => {
			return Array.from({ length: joker.count ?? 1 }, () => joker)
		}).map((joker, index) => {
			return { ...joker, index }
		}),
		cards: unresolvedState.cards.flatMap((card) => {
			return Array.from({ length: card.count ?? 1 }, () => card)
		}),
	}

	const playedCards = state.cards.filter((card) => card.played)
	const { playedHand, scoringCards: preliminaryScoringCards } = getHand(playedCards, state.jokerSet)
	const scoringCards = state.jokerSet.has('Splash') ? playedCards : preliminaryScoringCards

	const variants = getVariants(state, playedCards)
	const results = LUCKS.map<Result>((luck) => {
		const scores = variants.map((variant) => getScoreOfVariant(variant, luck, options?.formatScoreValue))
		const index = pickVariantIndex(scores, luck)
		const { chips, multiplier, balanced, score, log } = scores[index]!

		return {
			chips,
			multiplier,
			balanced,
			score,
			formattedScore: formatScore(score),
			luck,
			log,
			disabledJokerName: variants[index]!.disabledJokerName,
		}
	})

	return {
		hand: playedHand,
		scoringCards,
		results,
	}
}

/**
 * Crimson Heart disables a random joker each hand. Each possible joker therefore results in a scoring variant.
 */
function getVariants (state: State, playedCards: Card[]): Variant[] {
	if (state.blind.name !== 'Crimson Heart' || !state.blind.active || state.jokers.length === 0) {
		return [getVariant(state, playedCards)]
	}

	return state.jokers.map(({ index }) => getVariant(state, playedCards, index))
}

function getVariant (state: State, playedCards: Card[], disabledJokerIndex?: number): Variant {
	if (disabledJokerIndex === undefined) {
		const { playedHand, scoringCards } = getHand(playedCards, state.jokerSet)

		return {
			state,
			playedHand,
			scoringCards: state.jokerSet.has('Splash') ? playedCards : scoringCards,
		}
	}

	const jokers = state.jokers.map((joker) => {
		return joker.index === disabledJokerIndex ? { ...joker, disabled: true } : joker
	})
	const jokerSet = new Set(jokers.filter(({ disabled }) => !disabled).map(({ name }) => name))
	const variantState = { ...state, jokers, jokerSet }
	const { playedHand, scoringCards } = getHand(playedCards, jokerSet)

	return {
		state: variantState,
		playedHand,
		scoringCards: jokerSet.has('Splash') ? playedCards : scoringCards,
		disabledJokerName: state.jokers.find(({ index }) => index === disabledJokerIndex)?.name,
	}
}

function getScoreOfVariant (variant: Variant, luck: Luck, formatScoreValueFn?: ScoreValueFormatter): Score {
	const scoreValues = getScore(variant.state, variant.playedHand, variant.scoringCards, luck)

	return doBigMath(scoreValues, variant.state.deck, formatScoreValueFn)
}

/**
 * Picks the worst, best, or average scoring variant for the given luck. The average is the variant whose score is closest to the mean of all variants.
 */
function pickVariantIndex (scores: Score[], luck: Luck): number {
	if (scores.length === 1) {
		return 0
	}

	const values = scores.map(({ score }) => new Decimal(score))
	let index = 0

	if (luck === 'none') {
		for (const [i, value] of values.entries()) {
			if (value.lessThan(values[index]!)) {
				index = i
			}
		}
	} else if (luck === 'all') {
		for (const [i, value] of values.entries()) {
			if (value.greaterThan(values[index]!)) {
				index = i
			}
		}
	} else {
		const mean = Decimal.sum(...values).div(values.length)
		for (const [i, value] of values.entries()) {
			if (value.minus(mean).abs().lessThan(values[index]!.minus(mean).abs())) {
				index = i
			}
		}
	}

	return index
}

function getScore (state: State, playedHand: HandName, scoringCards: Card[], luck: Luck): ScoreValue[] {
	const baseScore = state.handBaseScores[playedHand]

	// Determine base chips and multiplier.
	// The Flint halves the base chips and multiplier.
	const baseFactor = (state.blind.name === 'The Flint' && state.blind.active ? 0.5 : 1)
	// The base score seems to be rounded here.
	const score: ScoreValue[] = []
	score.push(
		{
			chips: ['+', Math.round(baseScore.chips * baseFactor)],
			phase: 'base',
		},
		{
			multiplier: ['+', Math.round(baseScore.multiplier * baseFactor)],
			phase: 'base',
		},
	)

	for (const [index, card] of scoringCards.entries()) {
		for (const trigger of getPlayedCardTriggers({ state, card, index })) {
			// 1. Stone enhancement always applies even if a card is debuffed
			if (card.enhancement === 'Stone') {
				score.push({
					chips: ['+', 50],
					phase: 'played-cards',
					card,
					type: 'enhancement',
					trigger,
				})
			}

			// Beyond applying Stone enhancement, a debuffed card doesn't participate in scoring
			if (card.debuffed) {
				continue
			}

			// 2. Rank
			if (card.enhancement !== 'Stone') {
				score.push({
					chips: ['+', RANK_TO_CHIP_MAP[card.rank]],
					phase: 'played-cards',
					card,
					type: 'rank',
					trigger,
				})
			}

			// 2. Enhancement (other than Stone)
			switch (card.enhancement) {
				case 'Bonus': {
					score.push({
						chips: ['+', 30],
						phase: 'played-cards',
						card,
						type: 'enhancement',
						trigger,
					})
					break
				}
				case 'Mult': {
					score.push({
						multiplier: ['+', 4],
						phase: 'played-cards',
						card,
						type: 'enhancement',
						trigger,
					})
					break
				}
				case 'Lucky': {
					const denominator = 5
					const plusMult = 20
					const oopses = state.jokers.filter(({ name, disabled }) => name === 'Oops! All 6s' && !disabled)
					const mult = balanceMultWithLuck(plusMult, oopses.length, denominator, luck, 'plus')

					score.push({
						multiplier: ['+', mult],
						phase: 'played-cards',
						card,
						type: 'enhancement',
						trigger,
					})
					break
				}
				case 'Glass': {
					score.push({
						multiplier: ['*', 2],
						phase: 'played-cards',
						card,
						type: 'enhancement',
						trigger,
					})
					break
				}
			}

			// 3. Edition
			switch (card.edition) {
				case 'Foil': {
					score.push({
						chips: ['+', 50],
						phase: 'played-cards',
						card,
						type: 'edition',
						trigger,
					})
					break
				}
				case 'Holographic': {
					score.push({
						multiplier: ['+', 10],
						phase: 'played-cards',
						card,
						type: 'edition',
						trigger,
					})
					break
				}
				case 'Polychrome': {
					score.push({
						multiplier: ['*', 1.5],
						phase: 'played-cards',
						card,
						type: 'edition',
						trigger,
					})
					break
				}
			}

			// 4. Joker effects for played cards
			for (const joker of state.jokers) {
				if (joker.disabled) {
					continue
				}

				if (joker.playedCardEffect) {
					for (const trigger of getJokerTriggers({ state, joker })) {
						joker.playedCardEffect({ state, playedHand, scoringCards, score, card, luck, trigger })
					}
				}
			}
		}
	}

	for (const card of state.cards.filter(({ played }) => !played)) {
		// A debuffed card doesn't participate in scoring for held cards
		if (card.debuffed) {
			continue
		}

		for (const trigger of getHeldCardTriggers({ state, card })) {
			// 1. Enhancement
			switch (card.enhancement) {
				case 'Steel': {
					score.push({
						multiplier: ['*', 1.5],
						phase: 'held-cards',
						card,
						type: 'enhancement',
						trigger,
					})
					break
				}
			}

			// 2. Joker effects for held cards
			for (const joker of state.jokers) {
				if (joker.disabled) {
					continue
				}

				if (joker.heldCardEffect) {
					for (const trigger of getJokerTriggers({ state, joker })) {
						joker.heldCardEffect({ state, playedHand, scoringCards, score, card, luck, trigger })
					}
				}
			}
		}
	}

	for (const joker of state.jokers) {
		if (joker.disabled) {
			continue
		}

		// 1. Edition (additive)
		switch (joker.edition) {
			case 'Foil': {
				score.push({
					chips: ['+', 50],
					phase: 'jokers',
					joker,
					type: 'edition',
				})
				break
			}
			case 'Holographic': {
				score.push({
					multiplier: ['+', 10],
					phase: 'jokers', joker,
					type: 'edition',
				})
				break
			}
		}

		// 2. Joker effects
		if (joker.effect) {
			joker.effect({ state, playedHand, scoringCards, score, luck, trigger: 'Regular' })
		}

		// 3. Indirect Joker effects (i.e. effects depending on other jokers, e.g. Baseball Card)
		if (joker.indirectEffect) {
			for (const dependentJoker of state.jokers) {
				joker.indirectEffect({ state, playedHand, scoringCards, score, joker: dependentJoker, luck, trigger: 'Regular' })
			}
		}

		// 4. Edition (multiplicative)
		switch (joker.edition) {
			case 'Polychrome': {
				score.push({
					multiplier: ['*', 1.5],
					phase: 'jokers', joker,
					type: 'edition',
				})
				break
			}
		}
	}

	const planetCount = state.observatory[playedHand] ?? 0
	if (planetCount > 0) {
		score.push({
			multiplier: ['*', Math.pow(1.5, planetCount)],
			phase: 'consumables',
		})
	}

	return score
}

function getPlayedCardTriggers ({ state, card, index }: { state: State, card: Card, index: number }): string[] {
	const triggers = ['Regular']

	if (card.seal === 'Red') {
		triggers.push('Red Seal')
	}

	for (const joker of state.jokers) {
		const resolvedJoker = resolveJoker(state.jokers, joker)
		if (resolvedJoker === undefined) {
			continue
		}

		switch (resolvedJoker.name) {
			case 'Dusk': {
				if (state.hands === 1) triggers.push(resolvedJoker.name)
				break
			}
			case 'Hack': {
				if (isRank(card, ['2', '3', '4', '5'])) triggers.push(resolvedJoker.name)
				break
			}
			case 'Hanging Chad': {
				if (index === 0) {
					triggers.push(resolvedJoker.name, resolvedJoker.name)
				}
				break
			}
			case 'Seltzer': {
				triggers.push(resolvedJoker.name)
				break
			}
			case 'Sock and Buskin': {
				if (isFaceCard(card, state.jokerSet)) triggers.push(resolvedJoker.name)
				break
			}
		}
	}

	return triggers
}

function getHeldCardTriggers ({ state, card }: { state: State, card: Card }): string[] {
	const triggers = ['Regular']

	if (card.seal === 'Red') {
		triggers.push('Red Seal')
	}

	for (const joker of state.jokers) {
		const resolvedJoker = resolveJoker(state.jokers, joker)
		if (resolvedJoker === undefined) {
			continue
		}

		switch (resolvedJoker.name) {
			case 'Mime': {
				triggers.push(resolvedJoker.name)
				break
			}
		}
	}

	return triggers
}

function getJokerTriggers (options: { state: State, joker: Joker }) {
	const triggers = ['Regular']

	// Increase triggers from Blueprint/Brainstorm
	for (const joker of options.state.jokers) {
		if (['Blueprint', 'Brainstorm'].includes(joker.name)) {
			const resolvedJoker = resolveJoker(options.state.jokers, joker)
			if (resolvedJoker !== undefined && resolvedJoker.index === options.joker.index) {
				triggers.push(joker.name)
			}
		}
	}

	return triggers
}
