import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

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
})
