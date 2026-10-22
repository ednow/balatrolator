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

test.describe('Mobile playing cards', () => {
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
			{ x: boxes[1]!.x + boxes[1]!.width / 2, y: boxes[1]!.y + 10 },
			{ x: boxes[0]!.x + 10, y: boxes[0]!.y + 10 },
		)

		const ranks = await cards.evaluateAll((elements) => elements.map((element) => element.rank))
		expect(ranks).toEqual(['Queen', 'King'])
		expect(await cards.evaluateAll((elements) => elements.map((element) => element.played))).toEqual([true, true])
	})

	test('reorders cards by row without jumping to another row', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		for (let index = 0; index < 6; index++) {
			await container.dispatchEvent('dblclick')
		}

		const cards = page.locator('playing-card')
		await expect(cards).toHaveCount(6)

		const ranks = ['Ace', 'King', 'Queen', 'Jack', '10', '9']
		for (const [index, rank] of ranks.entries()) {
			await cards.nth(index).locator('.pc-rank-input').selectOption(rank)
		}

		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		expect(boxes[3]!.top).toBeGreaterThan(boxes[0]!.top)

		const from = { x: boxes[3]!.x + boxes[3]!.width / 2, y: boxes[3]!.y + 10 }
		const to = { x: from.x - 15, y: from.y }
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		await page.mouse.move(from.x - 20, from.y, { steps: 2 })
		await page.mouse.move(to.x, to.y, { steps: 4 })
		await page.mouse.up()

		expect(await cards.evaluateAll((elements) => elements.map((element) => element.rank))).toEqual(ranks)

		const movedBoxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		const crossRowFrom = { x: movedBoxes[3]!.x + movedBoxes[3]!.width / 2, y: movedBoxes[3]!.y + 10 }
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

	test('reorder cards via mouse drag in the mobile UI', async ({ page }) => {
		await page.goto('/')

		const container = page.locator('[data-c-container]')
		await container.dblclick()
		await container.dblclick()

		const cards = page.locator('playing-card')
		await cards.nth(0).locator('.pc-rank-input').selectOption('King')
		await cards.nth(1).locator('.pc-rank-input').selectOption('Queen')

		const boxes = await cards.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))
		const from = { x: boxes[1]!.x + boxes[1]!.width / 2, y: boxes[1]!.y + 10 }
		const to = { x: boxes[0]!.x + 10, y: boxes[0]!.y + 10 }
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
	test('remove a joker via long press', async ({ page }) => {
		await page.goto('/')

		await page.locator('[data-j-container]').dblclick()
		const joker = page.locator('joker-card').first()
		const box = await joker.boundingBox()
		const client = await page.context().newCDPSession(page)
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: box!.x + 10, y: box!.y + 10 }],
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
			{ x: boxes[0]!.x + 20, y: boxes[0]!.y + 20 },
			{ x: boxes[1]!.x + boxes[1]!.width - 10, y: boxes[1]!.y + 20 },
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
