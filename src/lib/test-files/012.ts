import type { TestCase } from '#lib/calculateScore.test.ts'

export default (message: string): TestCase => {
	return {
		message,
		initialState: {
			cards: [
				{ played: true, rank: '5', suit: 'Clubs' },
				{ played: true, rank: '5', suit: 'Diamonds' },
				{ played: true, rank: '5', suit: 'Diamonds' },
				{ played: true, rank: '5', suit: 'Diamonds' },
				{ played: true, rank: '5', suit: 'Spades', seal: 'Red' },
			],
			jokers: [
				{ name: 'Sixth Sense' },
				{ name: 'Odd Todd' },
				{ name: 'Fortune Teller', plusMultiplier: 9 },
				{ name: 'Swashbuckler', edition: 'Foil' },
				{ name: 'Ceremonial Dagger', plusMultiplier: 6 },
			],
		},
		expected: {
			hand: 'Five of a Kind',
			scoringCards: [
				{ rank: '5', suit: 'Clubs' },
				{ rank: '5', suit: 'Diamonds' },
				{ rank: '5', suit: 'Diamonds' },
				{ rank: '5', suit: 'Diamonds' },
				{ rank: '5', suit: 'Spades', seal: 'Red' },
			],
			results: [
				{ chips: '386', multiplier: '38', score: '14668', formattedScore: '14,668', luck: 'none' },
				{ chips: '386', multiplier: '38', score: '14668', formattedScore: '14,668', luck: 'average' },
				{ chips: '386', multiplier: '38', score: '14668', formattedScore: '14,668', luck: 'all' },
			],
		},
	}
}
