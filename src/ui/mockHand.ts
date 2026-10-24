import type { HandName, InitialCard, Rank, Suit } from '#lib/types.ts'

export const MOCK_HAND_EVENT = 'balatrolator:mock-hand'

function card (rank: Rank, suit: Suit): InitialCard {
	return { rank, suit, played: true }
}

/**
 * The lowest scoring configuration for each hand type: as few cards as possible and the lowest ranks.
 */
const MOCK_HANDS: Record<HandName, InitialCard[]> = {
	'High Card': [
		card('2', 'Clubs'),
	],
	'Pair': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
	],
	'Two Pair': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
		card('3', 'Clubs'),
		card('3', 'Diamonds'),
	],
	'Three of a Kind': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
		card('2', 'Hearts'),
	],
	'Straight': [
		card('Ace', 'Clubs'),
		card('2', 'Diamonds'),
		card('3', 'Hearts'),
		card('4', 'Spades'),
		card('5', 'Clubs'),
	],
	'Flush': [
		card('2', 'Clubs'),
		card('3', 'Clubs'),
		card('4', 'Clubs'),
		card('5', 'Clubs'),
		card('7', 'Clubs'),
	],
	'Full House': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
		card('2', 'Hearts'),
		card('3', 'Clubs'),
		card('3', 'Diamonds'),
	],
	'Four of a Kind': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
		card('2', 'Hearts'),
		card('2', 'Spades'),
	],
	'Straight Flush': [
		card('Ace', 'Clubs'),
		card('2', 'Clubs'),
		card('3', 'Clubs'),
		card('4', 'Clubs'),
		card('5', 'Clubs'),
	],
	'Five of a Kind': [
		card('2', 'Clubs'),
		card('2', 'Diamonds'),
		card('2', 'Hearts'),
		card('2', 'Spades'),
		card('2', 'Clubs'),
	],
	'Flush House': [
		card('2', 'Clubs'),
		card('2', 'Clubs'),
		card('2', 'Clubs'),
		card('3', 'Clubs'),
		card('3', 'Clubs'),
	],
	'Flush Five': [
		card('2', 'Clubs'),
		card('2', 'Clubs'),
		card('2', 'Clubs'),
		card('2', 'Clubs'),
		card('2', 'Clubs'),
	],
}

export function getMockHandCards (handName: HandName): InitialCard[] {
	return MOCK_HANDS[handName].map((initialCard) => ({ ...initialCard }))
}
