import type { TestCase } from '#lib/calculateScore.test.ts'

export default (message: string): TestCase => {
	return {
		message,
		initialState: {
			blind: { name: 'Crimson Heart' },
			cards: [
				{ played: true, rank: '7', suit: 'Spades' },
				{ played: true, rank: '7', suit: 'Hearts' },
			],
			jokers: [
				{ name: 'Blueprint' },
				{ name: 'Sly Joker' },
				{ name: 'Jolly Joker' },
				{ name: 'Joker' },
			],
		},
		expected: {
			hand: 'Pair',
			scoringCards: [
				{ rank: '7', suit: 'Spades' },
				{ rank: '7', suit: 'Hearts' },
			],
			results: [
				{ chips: '24', multiplier: '14', score: '336', formattedScore: '336', luck: 'none' },
				{ chips: '124', multiplier: '6', score: '744', formattedScore: '744', luck: 'average' },
				{ chips: '124', multiplier: '10', score: '1240', formattedScore: '1,240', luck: 'all' },
			],
		},
	}
}
