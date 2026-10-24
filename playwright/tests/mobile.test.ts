import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

async function touchDrag (page: Page, from: { x: number, y: number }, to: { x: number, y: number }) {
	const client = await page.context().newCDPSession(page)
	const direction = Math.sign(to.x - from.x)
	await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
	await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + direction * 20, y: from.y }] })
	await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] })
	await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
	await client.detach()
}

async function touchDoubleTap (page: Page, point: { x: number, y: number }) {
	const client = await page.context().newCDPSession(page)
	for (let index = 0; index < 2; index++) {
		await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
	}
	await client.detach()
}

function groupRowsByTop (boxes: { top: number }[]): number[][] {
	const rows: number[][] = []
	for (const [index, box] of boxes.entries()) {
		const row = rows.find((indices) => Math.abs(boxes[indices[0]!]!.top - box.top) < 10)
		if (row === undefined) {
			rows.push([index])
		} else {
			row.push(index)
		}
	}
	return rows.sort((a, b) => boxes[a[0]!]!.top - boxes[b[0]!]!.top)
}

const ROW_CASES: [number, number][] = []
for (let fromRow = 0; fromRow < 4; fromRow++) {
	for (let toRow = 0; toRow < 4; toRow++) {
		if (fromRow !== toRow) {
			ROW_CASES.push([fromRow, toRow])
		}
	}
}

const EMPTY_STATE_URL = '/?state=----1--5-___________-*_*_*_*_*_*_*_*_*_*_*_*--'

test.describe('Mobile playing cards', () => {
	test('disable pull-to-refresh while dragging', async ({ page }) => {
		await page.goto('/')

		await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none')
		await expect(page.locator('body')).toHaveCSS('overscroll-behavior-y', 'none')
	})

	test('show the modifiers in one row and remove a card via long press', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		await container.dblclick()

		const card = page.locator('playing-card').first()
		await expect(card).toBeVisible()

		await expect(page.locator('.pc-action-list')).toBeHidden()

		const modifierTops = await card.locator('.pc-modifier-row > .control-box').evaluateAll((elements) => {
			return elements.map((element) => Math.round(element.getBoundingClientRect().top))
		})
		expect(new Set(modifierTops).size).toBe(1)

		await expect(card.locator('.pc-modifier-row > .control-box > .label').first()).toBeHidden()

		const box = await card.boundingBox()
		const client = await page.context().newCDPSession(page)
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }],
		})
		await expect(card).toHaveClass(/--is-remove-armed/)
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

		const removeButton = card.locator('.pc-remove-button')
		await expect(removeButton).toBeVisible()
		await removeButton.click()

		await expect(page.locator('playing-card')).toHaveCount(0)
	})

	test('dim unplayed cards and toggle them with the play switch', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-c-container]').dblclick()
		const card = page.locator('playing-card').first()

		await expect(card).toHaveClass(/--is-played/)
		await expect(card).toHaveCSS('opacity', '1')

		await card.locator('.pc-play-toggle input').click()

		await expect(card).not.toHaveClass(/--is-played/)
		await expect(card).toHaveCSS('opacity', '0.55')

		await card.locator('.pc-play-toggle input').click()

		await expect(card).toHaveClass(/--is-played/)
		await expect(card).toHaveCSS('opacity', '1')
	})

	test('highlight Steel when a held card still takes effect', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-c-container]').dblclick()
		const card = page.locator('playing-card').first()
		const enhancement = card.locator('.pc-enhancement-input')
		await enhancement.selectOption('Steel')
		await card.locator('.pc-play-toggle input').click()

		await expect(card).not.toHaveClass(/--is-played/)
		await expect(card).toHaveClass(/--is-held-steel/)
		await expect(enhancement).toHaveCSS('background-color', 'rgb(253, 216, 104)')
		await expect(enhancement).toHaveCSS('border-top-color', 'rgb(202, 152, 2)')
		await expect(enhancement).toHaveCSS('color', 'rgb(17, 17, 17)')
		await expect(card).toHaveCSS('opacity', '1')
		await expect(card.locator('.pc-modifier:has(.pc-enhancement-input)')).toHaveCSS('z-index', '5')

		await card.locator('.pc-play-toggle input').click()

		await expect(card).toHaveClass(/--is-played/)
		await expect(card).not.toHaveClass(/--is-held-steel/)

		await card.locator('.pc-play-toggle input').click()
		await enhancement.selectOption('None')

		await expect(card).not.toHaveClass(/--is-held-steel/)
		await expect(card).toHaveCSS('opacity', '0.55')
	})

	test('reorder cards via touch drag without toggling their played state', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		await container.dblclick()
		await container.dblclick()

		const cards = page.locator('playing-card')
		await cards.nth(0).locator('.pc-rank-input').selectOption('King')
		await cards.nth(1).locator('.pc-rank-input').selectOption('Queen')
		await expect(cards.nth(0)).toHaveClass(/--is-played/)

		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		await touchDrag(
			page,
			{ x: boxes[1]!.x + boxes[1]!.width / 2, y: boxes[1]!.y + 30 },
			{ x: boxes[0]!.x + 10, y: boxes[0]!.y + 30 },
		)

		const ranks = await cards.evaluateAll((elements) => elements.map((element) => element.rank))
		expect(ranks).toEqual(['Queen', 'King'])
		expect(await cards.evaluateAll((elements) => elements.map((element) => element.played))).toEqual([true, true])
	})

	test('reorders cards by row without jumping to another row', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		for (let index = 0; index < 6; index++) {
			await container.dispatchEvent('dblclick', { bubbles: true })
		}

		const cards = page.locator('playing-card')
		await expect(cards).toHaveCount(6)

		const ranks = ['Ace', 'King', 'Queen', 'Jack', '10', '9']
		for (const [index, rank] of ranks.entries()) {
			await cards.nth(index).locator('.pc-rank-input').selectOption(rank)
		}

		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		expect(boxes[3]!.top).toBeGreaterThan(boxes[0]!.top)

		const from = { x: boxes[3]!.x + boxes[3]!.width / 2, y: boxes[3]!.y + 30 }
		const to = { x: from.x - 15, y: from.y }
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		await page.mouse.move(from.x - 20, from.y, { steps: 2 })
		await page.mouse.move(to.x, to.y, { steps: 4 })
		await page.mouse.up()

		expect(await cards.evaluateAll((elements) => elements.map((element) => element.rank))).toEqual(ranks)

		const movedBoxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		const crossRowFrom = { x: movedBoxes[3]!.x + movedBoxes[3]!.width / 2, y: movedBoxes[3]!.y + 30 }
		const crossRowTo = {
			x: movedBoxes[2]!.x + 10,
			y: movedBoxes[0]!.y + movedBoxes[0]!.height / 2,
		}
		await page.mouse.move(crossRowFrom.x, crossRowFrom.y)
		await page.mouse.down()
		await page.mouse.move(crossRowFrom.x - 20, crossRowFrom.y, { steps: 2 })
		await page.mouse.move(crossRowTo.x, crossRowTo.y, { steps: 4 })
		await page.mouse.up()

		expect(await cards.evaluateAll((elements) => elements.map((element) => element.rank))).toEqual(['Ace', 'King', 'Jack', 'Queen', '10', '9'])
	})

	test('drag cards across rows using the drag handle', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		for (let index = 0; index < 6; index++) {
			await container.dispatchEvent('dblclick', { bubbles: true })
		}

		const cards = page.locator('playing-card')
		const ranks = ['Ace', 'King', 'Queen', 'Jack', '10', '9']
		for (const [index, rank] of ranks.entries()) {
			await cards.nth(index).locator('.pc-rank-input').selectOption(rank)
		}

		const handles = await cards.evaluateAll((elements) => elements.map((element) => {
			const { x, y, width, height } = element.querySelector('.card-drag-handle')!.getBoundingClientRect()
			return { x: x + width / 2, y: y + height / 2 }
		}))
		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))

		const client = await page.context().newCDPSession(page)
		await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [handles[3]!] })
		await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: handles[3]!.x, y: handles[3]!.y - 20 }] })
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: boxes[0]!.x + 10, y: handles[0]!.y }],
		})
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

		expect(await cards.evaluateAll((elements) => elements.map((element) => element.rank))).toEqual(['Jack', 'Ace', 'King', 'Queen', '10', '9'])
	})

	test('moves cards between every row pair', async ({ page }) => {
		test.setTimeout(180_000)

		const ranks = ['Ace', 'King', 'Queen', 'Jack', '10', '9', '8', '7', '6', '5', '4', '3']

		for (const [fromRow, toRow] of ROW_CASES) {
			await page.goto(EMPTY_STATE_URL)

			const container = page.locator('[data-c-container]')
			await Promise.all(ranks.map(() => container.dispatchEvent('dblclick', { bubbles: true })))

			const cards = page.locator('playing-card')
			for (const [index, rank] of ranks.entries()) {
				await cards.nth(index).locator('.pc-rank-input').selectOption(rank)
			}

			const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
			const rows = groupRowsByTop(boxes)

			const sourceIndex = rows[fromRow]![0]!
			const targetIndex = rows[toRow]![0]!
			const source = boxes[sourceIndex]!
			const target = boxes[targetIndex]!
			const draggedRank = ranks[sourceIndex]!

			await page.mouse.move(source.x + source.width / 2, source.y + 30)
			await page.mouse.down()
			await page.mouse.move(source.x + source.width / 2, source.y + (toRow > fromRow ? 50 : -50), { steps: 2 })
			await page.mouse.move(target.x + 10, target.y + target.height / 2, { steps: 6 })
			await page.mouse.up()

			const landed = await cards.evaluateAll((elements, rank) => {
				const entries = elements.map((element) => {
					const { top, left } = element.getBoundingClientRect()
					return { rank: element.rank as string, top: Math.round(top), left: Math.round(left) }
				})
				const tops = [...new Set(entries.map((entry) => entry.top))].sort((a, b) => a - b)
				const card = entries.find((entry) => entry.rank === rank)!
				const rowEntries = entries.filter((entry) => entry.top === card.top).sort((a, b) => a.left - b.left)
				return {
					row: tops.indexOf(card.top),
					column: rowEntries.findIndex((entry) => entry.rank === rank),
				}
			}, draggedRank)

			expect.soft(landed.row, `row ${fromRow + 1} → ${toRow + 1}`).toBe(toRow)
			expect.soft(landed.column, `row ${fromRow + 1} → ${toRow + 1}`).toBe(0)
		}
	})

	test('reorder cards via mouse drag in the mobile UI', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		await container.dblclick()
		await container.dblclick()

		const cards = page.locator('playing-card')
		await cards.nth(0).locator('.pc-rank-input').selectOption('King')
		await cards.nth(1).locator('.pc-rank-input').selectOption('Queen')

		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		const from = { x: boxes[1]!.x + boxes[1]!.width / 2, y: boxes[1]!.y + 30 }
		const to = { x: boxes[0]!.x + 10, y: boxes[0]!.y + 30 }
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		await page.mouse.move(from.x - 20, from.y, { steps: 3 })
		await page.mouse.move(to.x, to.y, { steps: 5 })
		await page.mouse.up()

		const ranks = await cards.evaluateAll((elements) => elements.map((element) => element.rank))
		expect(ranks).toEqual(['Queen', 'King'])
	})
})

test.describe('Mobile jokers', () => {
	test('add a joker by double tapping anywhere on the panel', async ({ page }) => {
		await page.goto('/')

		const panel = page.locator('.form__jokers.panel')
		const box = (await panel.boundingBox())!
		await touchDoubleTap(page, { x: box.x + 5, y: box.y + box.height / 2 })

		await expect(page.locator('joker-card')).toHaveCount(1)
	})

	test('remove a joker via long press', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-j-container]').dblclick()
		const joker = page.locator('joker-card').first()
		const box = await joker.boundingBox()
		const client = await page.context().newCDPSession(page)
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }],
		})
		await expect(joker).toHaveClass(/--is-remove-armed/)
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

		const removeButton = joker.locator('.jc-remove-button')
		await expect(removeButton).toBeVisible()
		await removeButton.click()

		await expect(page.locator('joker-card')).toHaveCount(0)
	})

	test('reorder jokers via touch drag', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-j-container]')
		await container.dblclick()
		await container.dblclick()

		const jokers = page.locator('joker-card')
		await jokers.nth(0).locator('combo-box').evaluate((element) => {
			;(element as { value: string }).value = 'Joker'
		})
		await jokers.nth(1).locator('combo-box').evaluate((element) => {
			;(element as { value: string }).value = 'Blueprint'
		})

		const boxes = await jokers.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		await touchDrag(
			page,
			{ x: boxes[0]!.x + 20, y: boxes[0]!.y + 30 },
			{ x: boxes[1]!.x + boxes[1]!.width - 10, y: boxes[1]!.y + 30 },
		)

		const names = await jokers.evaluateAll((elements) => elements.map((element) => element.jokerName))
		expect(names).toEqual(['Blueprint', 'Joker'])
	})

	test('dim inactive jokers with an active toggle', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-j-container]').dblclick()
		const joker = page.locator('joker-card').first()
		await joker.locator('combo-box').evaluate((element) => {
			;(element as { value: string }).value = 'Loyalty Card'
		})

		await expect(joker).toHaveClass(/--has-is-active/)
		await expect(joker.locator('.jc-active-label')).toBeVisible()
		await expect(joker).toHaveCSS('opacity', '1')

		await joker.locator('.jc-is-active-input').uncheck()

		await expect(joker).toHaveClass(/--is-inactive/)
		await expect(joker).toHaveCSS('opacity', '0.55')

		await joker.locator('.jc-is-active-input').check()

		await expect(joker).not.toHaveClass(/--is-inactive/)
		await expect(joker).toHaveCSS('opacity', '1')
	})
})

test.describe('Mobile clearing', () => {
	test('opens the clear options via long press', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-c-container]').dblclick()
		await expect(page.locator('playing-card')).toHaveCount(1)

		const clearButton = page.getByRole('button', { name: /^Clear$/ })
		const box = await clearButton.boundingBox()
		const client = await page.context().newCDPSession(page)
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }],
		})
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await client.detach()

		await dialog.getByRole('button', { name: /^Hand$/ }).click()

		await expect(dialog).toBeHidden()
		await expect(page.locator('playing-card')).toHaveCount(0)
	})
})
