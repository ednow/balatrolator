import { html } from 'lit-html'

import type { BlindName, Card, Edition, Enhancement, Rank, Seal, Suit } from '#lib/types.ts'
import { getLang, t, term, termEdition, termEnhancement, termSeal } from '#ui/i18n.ts'
import { MovableCard } from './MovableCard.ts'
import { getShortcutKey } from '../getShortcutKey.ts'

const lightCss = /*css*/`
	playing-card {
		--c-text: var(--c-black);
		--c-text-disabled: var(--c-yellow-dark);
		--c-border: var(--c-yellow-dark);
		--c-background-light: var(--c-yellow-light);
		--c-background-lighter: var(--c-yellow-lighter);

		position: relative;
		display: block;
		transition: opacity 0.15s;
	}

	@media (prefers-contrast: more) {
		playing-card {
			--c-border: var(--c-black);
			--c-background-light: var(--c-grey-light);
			--c-background-lighter: var(--c-white);
		}
	}

	html.mobile-ui playing-card {
		user-select: none;
		-webkit-touch-callout: none;
	}

	/* Mobile: replace the action row with a long-press remove button. */
	html.mobile-ui playing-card .pc-action-list {
		display: none;
	}

	playing-card .pc-modifier-row {
		flex-direction: column;
		gap: 0.5rem;
	}

	playing-card .pc-modifier-row > * {
		flex: 0 0 auto;
	}

	html.mobile-ui playing-card .pc-modifier-row {
		flex-direction: row;
		gap: 0.25rem;
		align-items: stretch;
	}

	html.mobile-ui playing-card .pc-modifier-row > .control-box {
		position: relative;
		display: block;
		flex: 1 1 2.2rem;
		min-inline-size: 2.2rem;
	}

	html.mobile-ui playing-card .pc-modifier-row > .control-box > .label {
		display: none;
	}

	/* With no value selected, the field name takes the place of the empty option’s text. */
	html.mobile-ui playing-card .pc-modifier:has(select option:checked[value="Base"], select option:checked[value="None"]) select {
		color: transparent;
	}

	html.mobile-ui playing-card .pc-modifier:has(select option:checked[value="Base"], select option:checked[value="None"])::before {
		content: attr(data-empty-label);
		position: absolute;
		z-index: 1;
		inset-block: 0;
		inset-inline: 0.25rem;
		display: block;
		overflow: hidden;
		padding-inline: 0.1rem;
		font-size: 0.8rem;
		line-height: 2rem;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
		pointer-events: none;
	}

	html.mobile-ui playing-card .pc-modifier-row select {
		inline-size: 100%;
		min-inline-size: 0;
		max-inline-size: none;
		block-size: 1.75rem;
		padding-inline: 0.1rem;
		border-width: 1px;
		font-size: 0.8rem;
	}

	html.mobile-ui playing-card .pc-modifier-row select::picker-icon {
		display: none;
	}

	html.mobile-ui playing-card .pc-seal-input selectedcontent .pc-seal-orb {
		display: none;
	}

	playing-card:not(.--is-played) {
		opacity: 0.55;
	}

	playing-card.--is-held-steel .pc-enhancement-input {
		color: var(--c-blue-dark);
		border-color: var(--c-blue-dark);
		background-color: var(--c-white);
		font-weight: bold;
		box-shadow: 0 0 0 2px var(--c-blue-dark);
	}

	.pc-play-toggle {
		display: none;
	}

	html.mobile-ui playing-card .pc-play-toggle {
		display: inline-flex;
		align-items: center;
		align-self: flex-end;
		gap: 0.25rem;
		margin-block-start: 0.25rem;
		padding: 0.1rem 0.35rem;
		border-radius: 999px;
		background-color: var(--c-background-lighter);
		font-size: 0.75rem;
		line-height: 1.2;
	}

	html.mobile-ui playing-card .pc-play-toggle .label {
		font-weight: bold;
	}

	playing-card:where([draggable="true"]) {
		cursor: ew-resize;
	}

	playing-card:where(.--is-played) {
		margin-block-end: 1.5rem;
	}

	playing-card:not(:where(.--is-played)) {
		margin-block-start: 1.5rem;
	}

	playing-card:not(.--is-blind-the-pillar) .pc-is-debuffed {
		display: none;
	}

	playing-card .pc-rank-suit {
		flex-wrap: nowrap;
		align-items: center;
	}

	playing-card .pc-rank-suit > .control-box:has(.pc-rank-input) {
		flex: 0 0 auto;
	}

	playing-card .pc-rank-suit > .control-box:has(.pc-suit-input) {
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	.pc-rank-input {
		inline-size: auto;
		min-inline-size: 2.25rem;
		max-inline-size: 3.25rem;
		font-weight: bold;
	}

	.pc-suit-input {
		inline-size: auto;
		min-inline-size: 4.25rem;
		max-inline-size: 5.5rem;
		font-weight: bold;
		white-space: nowrap;
		color: var(--c-text);
	}

	.pc-suit-input [data-term-label] {
		white-space: nowrap;
	}

	playing-card.--suit-Hearts .pc-suit-input selectedcontent,
	playing-card.--suit-Hearts .pc-suit-input selectedcontent .icon {
		color: var(--c-suit-hearts);
	}

	playing-card.--suit-Diamonds .pc-suit-input selectedcontent,
	playing-card.--suit-Diamonds .pc-suit-input selectedcontent .icon {
		color: var(--c-suit-diamonds);
	}

	@media (prefers-contrast: more) {
		playing-card.--suit-Hearts .pc-suit-input selectedcontent,
		playing-card.--suit-Hearts .pc-suit-input selectedcontent .icon {
			color: hsl(0 75% 32%);
		}

		playing-card.--suit-Diamonds .pc-suit-input selectedcontent,
		playing-card.--suit-Diamonds .pc-suit-input selectedcontent .icon {
			color: hsl(28 75% 34%);
		}
	}

	.pc-edition-input {
		inline-size: auto;
		min-inline-size: 4.5rem;
		max-inline-size: 8.5rem;
		flex: 1 1 auto;
	}

	.pc-enhancement-input {
		inline-size: auto;
		min-inline-size: 4rem;
		max-inline-size: 5.5rem;
		flex: 1 1 auto;
	}

	.pc-seal-input {
		inline-size: auto;
		min-inline-size: 4rem;
		max-inline-size: 5.5rem;
		flex: 1 1 auto;
	}

	.pc-seal-orb {
		background-color: var(--seal-color, transparent);
		border: 1px solid #000;
		border-radius: 50%;
		display: block;
		block-size: 1rem;
		inline-size: 1rem;
	}
`
const lightStyleSheet = await new CSSStyleSheet().replace(lightCss)

export class PlayingCard extends MovableCard {
	static {
		if (window.customElements.get('playing-card') === undefined) {
			window.customElements.define('playing-card', PlayingCard)
			document.adoptedStyleSheets.push(lightStyleSheet)
		}
	}

	#played = true
	#count = 1
	#debuffed = false
	#rank: Rank = 'Ace'
	#suit: Suit = 'Clubs'
	#edition: Edition = 'Base'
	#enhancement: Enhancement = 'None'
	#seal: Seal = 'None'

	#commands: Record<string, { action: (event: KeyboardEvent) => void }> = {
		ArrowLeft: {
			action: () => this.swapLeft(),
		},
		'Ctrl+ArrowLeft': {
			action: () => this.moveToStart(),
		},
		ArrowRight: {
			action: () => this.swapRight(),
		},
		'Ctrl+ArrowRight': {
			action: () => this.moveToEnd(),
		},
		Backspace: {
			action: (event) => {
				if (event.target === this) {
					this.remove()
				}
			},
		},
		Delete: {
			action: (event) => {
				if (event.target === this) {
					this.remove()
				}
			},
		},
	}

	constructor (card?: Omit<Card, 'index'>) {
		super()

		if (!this.id) {
			this.id = `${this.tagName.toLowerCase()}-${this.uniqueId}`
		}
		this.classList.add('card', '--is-played')
		this.draggable = true
		this.tabIndex = 0
		this.role = 'group'
		this.setAttribute('aria-labelledby', `${this.tagName.toLowerCase()}-${this.uniqueId}-title`)

		if (card) {
			this.played = card.played
			this.count = card.count
			this.debuffed = card.debuffed
			this.rank = card.rank
			this.suit = card.suit
			this.edition = card.edition
			this.enhancement = card.enhancement
			this.seal = card.seal
		} else {
			this.#syncSuitColorClass()
		}

		this.#syncHeldSteelClass()

		// Allow clicking the card to toggle its played state.
		this.addEventListener('click', (event) => {
			if (!event.isTrusted || isInteractive(event)) {
				return
			}

			this.played = !this.played
		}, { capture: true })

		this.addEventListener('keydown', (event) => {
			const key = getShortcutKey(event)
			const command = this.#commands[key]
			if (command) {
				command.action(event)
			}
		})
	}

	get index () {
		return Array.from(this.parentElement!.children).indexOf(this)
	}

	get rank () {
		return this.#rank
	}

	set rank (rank) {
		this.#rank = rank

		this.queueRender()
	}

	get suit () {
		return this.#suit
	}

	set suit (suit) {
		this.#suit = suit
		this.#syncSuitColorClass()

		this.queueRender()
	}

	#syncSuitColorClass () {
		for (const suit of ['Clubs', 'Spades', 'Hearts', 'Diamonds']) {
			this.classList.remove(`--suit-${suit}`)
		}

		this.classList.add(`--suit-${this.#suit}`)
	}

	get edition () {
		return this.#edition
	}

	set edition (edition) {
		this.#edition = edition

		this.queueRender()
	}

	get enhancement () {
		return this.#enhancement
	}

	set enhancement (enhancement) {
		this.#enhancement = enhancement

		this.#syncHeldSteelClass()
		this.queueRender()
	}

	get seal () {
		return this.#seal
	}

	set seal (seal) {
		this.#seal = seal

		this.queueRender()
	}

	get played () {
		return this.#played
	}

	set played (played) {
		this.#played = played

		this.classList[this.played ? 'add' : 'remove']('--is-played')

		this.#syncHeldSteelClass()
		this.queueRender()
	}

	get debuffed () {
		return this.#debuffed
	}

	set debuffed (debuffed) {
		this.#debuffed = debuffed

		this.classList[this.debuffed ? 'add' : 'remove']('--is-debuffed')

		this.#syncHeldSteelClass()
		this.queueRender()
	}

	#syncHeldSteelClass () {
		const isHeldSteel = !this.played && this.enhancement === 'Steel' && !this.debuffed
		this.classList[isHeldSteel ? 'add' : 'remove']('--is-held-steel')
	}

	get count () {
		return this.#count
	}

	set count (count) {
		this.#count = count

		this.queueRender()
	}

	toString () {
		const modifiers = [
			this.edition !== 'Base' ? termEdition(this.edition) : undefined,
			this.enhancement !== 'None' ? termEnhancement(this.enhancement) : undefined,
			this.seal !== 'None' ? termSeal(this.seal) : undefined,
		].filter((modifier) => modifier !== undefined)
		const modifierText = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : ''

		if (getLang() === 'zh') {
			return `卡牌 ${this.index + 1}：${term(this.suit)}${term(this.rank)}${modifierText}`
		}

		return `Card ${this.index + 1}: ${this.rank} of ${this.suit}${modifierText}`
	}

	template () {
		return html`
			<div class="stack">
				<button class="card-drag-handle" data-card-drag-handle type="button" aria-label="${t('dragToReorder')}"></button>

				<div class="action-list pc-action-list">
					<button
						class="button --icon"
						?disabled="${this.previousElementSibling === null}"
						type="button"
						@click="${this.swapLeft}"
					>
						<span class="visually-hidden">${t('moveCardLeft')}</span>

						<svg class="icon">
							<use xlink:href="#arrow-left-icon"></use>
						</svg>
					</button>

					<label class="checkbox-control">
						<input
							name="card-is-played-${this.uniqueId}"
							type="checkbox"
							value="is-played"
							checked
							.checked="${this.played}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.played = input.checked
							}}"
						>

						<span class="visually-hidden">${t('play')}</span>
					</label>

					<button
						class="button --icon push-inline-start"
						type="button"
						@click="${() => this.remove()}"
					>
						<span class="visually-hidden">${t('removeCard')}</span>

						<svg class="icon">
							<use xlink:href="#trash-icon"></use>
						</svg>
					</button>

					<button
						class="button --icon"
						?disabled="${this.nextElementSibling === null}"
						type="button"
						@click="${this.swapRight}"
					>
						<span class="visually-hidden">${t('moveCardRight')}</span>

						<svg class="icon">
							<use xlink:href="#arrow-right-icon"></use>
						</svg>
					</button>
				</div>

				<div class="input-list pc-rank-suit">
					<span id="${this.tagName.toLowerCase()}-${this.uniqueId}-title" class="visually-hidden">${this.toString()}</span>

					<label class="control-box">
						<span class="visually-hidden">${t('rank')}</span>

						<select
							class="pc-rank-input select"
							id="card-rank-${this.uniqueId}"
							name="card-rank-${this.uniqueId}"
							.value="${this.rank}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.rank = input.value as Rank
							}}"
						>
							<option value="Ace" selected>${term('Ace')}</option>
							<option value="King">${term('King')}</option>
							<option value="Queen">${term('Queen')}</option>
							<option value="Jack">${term('Jack')}</option>
							<option value="10">${term('10')}</option>
							<option value="9">${term('9')}</option>
							<option value="8">${term('8')}</option>
							<option value="7">${term('7')}</option>
							<option value="6">${term('6')}</option>
							<option value="5">${term('5')}</option>
							<option value="4">${term('4')}</option>
							<option value="3">${term('3')}</option>
							<option value="2">${term('2')}</option>
						</select>
					</label>

					<label class="control-box">
						<span class="visually-hidden">${t('suit')}</span>

						<select
							class="pc-suit-input select"
							id="card-suit-${this.uniqueId}"
							name="card-suit-${this.uniqueId}"
							.value="${this.suit}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.suit = input.value as Suit
							}}"
						>
							<button><selectedcontent></selectedcontent></button>
							<option value="Clubs" selected>
								<svg aria-hidden="true" class="icon --small">
									<use xlink:href="#clubs-icon"></use>
								</svg>
									<span data-term-label="Clubs"></span>
							</option>
							<option value="Spades">
								<svg aria-hidden="true" class="icon --small">
									<use xlink:href="#spades-icon"></use>
								</svg>
								<span data-term-label="Spades"></span>
							</option>
							<option value="Hearts">
								<svg aria-hidden="true" class="icon --small">
									<use xlink:href="#hearts-icon"></use>
								</svg>
								<span data-term-label="Hearts"></span>
							</option>
							<option value="Diamonds">
								<svg aria-hidden="true" class="icon --small">
									<use xlink:href="#diamonds-icon"></use>
								</svg>
								<span data-term-label="Diamonds"></span>
							</option>
						</select>
					</label>

					<button
						class="button --icon duplicate-button"
						type="button"
						title="${t('duplicateLongPressHint')}"
						@pointerdown="${this.duplicatePointerDown}"
						@pointerup="${this.duplicatePointerUp}"
						@pointercancel="${this.duplicatePointerUp}"
						@pointerleave="${this.duplicatePointerUp}"
						@click="${this.duplicateClick}"
					>
						<span class="visually-hidden">${t('duplicateCard')}</span>

						<svg class="icon">
							<use xlink:href="#copy-icon"></use>
						</svg>
					</button>
				</div>

				<label class="pc-is-debuffed checkbox-control">
					<input
						class="pc-is-debuffed-input"
						name="card-is-debuffed-${this.uniqueId}"
						type="checkbox"
						value="is-debuffed"
						.checked="${this.debuffed}"
						@change="${(event: Event) => {
							const input = event.target as HTMLInputElement
							this.debuffed = input.checked
						}}"
					>

					<span class="label">${t('debuffed')}</span>
				</label>

				<div class="input-list pc-modifier-row">
					<label class="control-box --flat --grow pc-modifier" data-empty-label="${t('edition')}">
						<span class="label truncate">${t('edition')}</span>

						<select
							class="pc-edition-input select"
							aria-label="${t('edition')}"
							id="card-edition-${this.uniqueId}"
							name="card-edition-${this.uniqueId}"
							.value="${this.edition}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.edition = input.value as Edition
							}}"
						>
							<option value="Base" selected>${termEdition('Base')}</option>
							<option value="Foil">${termEdition('Foil')}</option>
							<option value="Holographic">${termEdition('Holographic')}</option>
							<option value="Polychrome">${termEdition('Polychrome')}</option>
						</select>
					</label>

					<label class="control-box --flat --grow pc-modifier" data-empty-label="${t('enhancement')}">
						<span class="label truncate">${t('enhancement')}</span>

						<select
							class="pc-enhancement-input select"
							aria-label="${t('enhancement')}"
							id="card-enhancement-${this.uniqueId}"
							name="card-enhancement-${this.uniqueId}"
							.value="${this.enhancement}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.enhancement = input.value as Enhancement
							}}"
						>
							<option value="None" selected>${termEnhancement('None')}</option>
							<option value="Bonus">${termEnhancement('Bonus')}</option>
							<option value="Mult">${termEnhancement('Mult')}</option>
							<option value="Wild">${termEnhancement('Wild')}</option>
							<option value="Glass">${termEnhancement('Glass')}</option>
							<option value="Steel">${termEnhancement('Steel')}</option>
							<option value="Stone">${termEnhancement('Stone')}</option>
							<option value="Gold">${termEnhancement('Gold')}</option>
							<option value="Lucky">${termEnhancement('Lucky')}</option>
						</select>
					</label>

					<label class="control-box --flat --grow pc-modifier" data-empty-label="${t('seal')}">
						<span class="label truncate">${t('seal')}</span>

						<select
							class="pc-seal-input select"
							aria-label="${t('seal')}"
							id="card-seal-${this.uniqueId}"
							name="card-seal-${this.uniqueId}"
							.value="${this.seal}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.seal = input.value as Seal
							}}"
						>
							<button><selectedcontent></selectedcontent></button>
							<option value="None" selected>
								<span aria-hidden="true" class="pc-seal-orb" style="--seal-color: transparent"></span>
								<span data-term-kind="seal-color" data-term-label="None"></span>
							</option>
							<option value="Gold">
								<span aria-hidden="true" class="pc-seal-orb" style="--seal-color: var(--c-seal-gold)"></span>
								<span data-term-kind="seal-color" data-term-label="Gold"></span>
							</option>
							<option value="Red">
								<span aria-hidden="true" class="pc-seal-orb" style="--seal-color: var(--c-seal-red)"></span>
								<span data-term-kind="seal-color" data-term-label="Red"></span>
							</option>
							<option value="Blue">
								<span aria-hidden="true" class="pc-seal-orb" style="--seal-color: var(--c-seal-blue)"></span>
								<span data-term-kind="seal-color" data-term-label="Blue"></span>
							</option>
							<option value="Purple">
								<span aria-hidden="true" class="pc-seal-orb" style="--seal-color: var(--c-seal-purple)"></span>
								<span data-term-kind="seal-color" data-term-label="Purple"></span>
							</option>
						</select>
					</label>
				</div>

				<label class="pc-play-toggle checkbox-control">
					<input
						name="card-is-played-toggle-${this.uniqueId}"
						type="checkbox"
						value="is-played"
						.checked="${this.played}"
						@change="${(event: Event) => {
							const input = event.target as HTMLInputElement
							this.played = input.checked
						}}"
					>

					<span class="label">${t('playCard')}</span>
				</label>

				<button
					class="button --icon pc-remove-button card-remove-button"
					type="button"
					@click="${() => this.remove()}"
				>
					<span class="visually-hidden">${t('removeCard')}</span>

					<svg class="icon">
						<use xlink:href="#trash-icon"></use>
					</svg>
				</button>
			</div>
		`
	}

	toggleBlindEffects (blindName: BlindName, isActive: boolean) {
		const isThePillarBlind = blindName === 'The Pillar' && isActive
		this.classList[isThePillarBlind ? 'add' : 'remove']('--is-blind-the-pillar')
	}

	duplicateInPlace (count = 1) {
		const copies = document.createDocumentFragment()
		const blindNameInput = document.querySelector<HTMLElement>('[name="blindName"]')
		const blindIsActiveCheckbox = document.querySelector<HTMLInputElement>('[name="blindIsActive"]')

		for (let index = 0; index < count; index++) {
			const copy = this.clone()

			if (blindNameInput && blindIsActiveCheckbox && 'value' in blindNameInput) {
				copy.toggleBlindEffects(String(blindNameInput.value) as BlindName, blindIsActiveCheckbox.checked)
			}

			copies.append(copy)
		}

		this.after(copies)
	}

	clone () {
		return new PlayingCard({
			rank: this.rank,
			suit: this.suit,
			edition: this.edition,
			enhancement: this.enhancement,
			seal: this.seal,
			debuffed: this.debuffed,
			played: this.played,
			count: this.count,
		})
	}
}

function isInteractive (event: Event): boolean {
	for (const target of event.composedPath()) {
		if (target === event.currentTarget) {
			break
		}

		if (
			target instanceof HTMLLabelElement ||
			target instanceof HTMLSelectElement ||
			target instanceof HTMLInputElement ||
			target instanceof HTMLButtonElement ||
			(target instanceof HTMLAnchorElement && target.href)
		) {
			return true
		}
	}

	return false
}
