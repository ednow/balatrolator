import { html } from 'lit-html'

import { JOKER_DEFINITIONS } from '#lib/data.ts'
import type { Joker, JokerEdition, JokerName, Rank, Suit } from '#lib/types.ts'
import { getLang, t, term, termEdition } from '#ui/i18n.ts'
import { MovableCard } from './MovableCard.ts'
import { getShortcutKey } from '../getShortcutKey.ts'

const lightCss = /*css*/`
	joker-card {
		--c-text: var(--c-black);
		--c-text-disabled: var(--c-red-dark);
		--c-border: var(--c-red-dark);
		--c-background-light: var(--c-red-light);
		--c-background-lighter: var(--c-red-lighter);

		position: relative;
		display: block;
		transition: opacity 0.15s;
	}

	joker-card.--is-inactive {
		opacity: 0.55;
	}

	.jc-active-label {
		display: none;
	}

	html.mobile-ui joker-card:not(.--has-is-active) .jc-action-list {
		display: none;
	}

	html.mobile-ui joker-card .jc-action-list .button {
		display: none;
	}

	html.mobile-ui joker-card .jc-action-list {
		align-items: center;
		min-block-size: 1.5rem;
	}

	html.mobile-ui joker-card .jc-active-label {
		display: inline;
		font-size: 0.8rem;
		font-weight: bold;
	}

	@media (prefers-contrast: more) {
		joker-card {
			--c-border: var(--c-black);
			--c-background-light: var(--c-grey-light);
			--c-background-lighter: var(--c-white);
		}
	}

	joker-card:where([draggable="true"]) {
		cursor: ew-resize;
	}

	.jc-name-input {
		font-weight: bold;
	}

	.jc-edition-row {
		display: flex;
		flex-direction: column;
	}

	.jc-edition-row>*+* {
		margin-block-start: 0.5rem;
	}

	html:not(.mobile-ui) .jc-edition-row {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem;
	}

	html:not(.mobile-ui) .jc-edition-row>*+* {
		margin-block-start: 0;
	}

	html:not(.mobile-ui) .jc-edition-row>* {
		flex: 0 1 auto;
		min-inline-size: 0;
	}

	html:not(.mobile-ui) .jc-edition-row>.jc-edition {
		flex: 1 1 auto;
	}

	html:not(.mobile-ui) joker-card:is(.--has-plus-chips, .--has-plus-multiplier, .--has-times-multiplier) .jc-edition-row>.jc-edition {
		flex: 0 1 auto;
	}

	html:not(.mobile-ui) .jc-edition-row>:is(.jc-plus-chips, .jc-plus-multiplier, .jc-times-multiplier) {
		flex: 1 1 auto;
	}

	html:not(.mobile-ui) .jc-edition-row :is(.jc-plus-chips-input, .jc-plus-multiplier-input, .jc-times-multiplier-input) {
		flex: 1 1 auto;
		inline-size: 4rem;
		min-inline-size: 0;
		max-inline-size: 7rem;
	}

	.jc-edition-input {
		inline-size: auto;
		min-inline-size: 4.5rem;
		max-inline-size: 8.5rem;
		flex: 1 1 auto;
	}

	joker-card:not(.--has-plus-chips) .jc-plus-chips {
		display: none;
	}

	joker-card:not(.--has-plus-multiplier) .jc-plus-multiplier {
		display: none;
	}

	joker-card:not(.--has-times-multiplier) .jc-times-multiplier {
		display: none;
	}

	joker-card:not(.--has-is-active) .jc-is-active {
		display: none;
	}

	.jc-name-row > label {
		flex: 1 1 auto;
		min-inline-size: 0;
	}

	joker-card:not(.--has-rank):not(.--has-suit) .jc-card {
		display: none;
	}

	joker-card:not(.--has-rank) .jc-rank {
		display: none;
	}

	.jc-rank-input {
		inline-size: 5rem;
	}

	.jc-card-of {
		text-align: center;
	}

	joker-card.--has-rank:not(.--has-suit) .jc-card-of,
	joker-card:not(.--has-rank).--has-suit .jc-card-of {
		display: none;
	}

	joker-card:not(.--has-suit) .jc-suit {
		display: none;
	}

	.jc-suit-input {
		inline-size: 8rem;
		color: var(--c-text);
	}

	joker-card.--suit-Hearts .jc-suit-input selectedcontent,
	joker-card.--suit-Hearts .jc-suit-input selectedcontent .icon {
		color: var(--c-suit-hearts);
	}

	joker-card.--suit-Diamonds .jc-suit-input selectedcontent,
	joker-card.--suit-Diamonds .jc-suit-input selectedcontent .icon {
		color: var(--c-suit-diamonds);
	}

	.jc-plus-chips-input {
		inline-size: 7rem;
		text-align: end;
	}

	.jc-plus-multiplier-input {
		inline-size: 7rem;
		text-align: end;
	}

	.jc-times-multiplier-input {
		inline-size: 7rem;
		text-align: end;
	}

	joker-card .action-list .jc-is-active {
		flex: 0 0 auto;
	}
`
const lightStyleSheet = await new CSSStyleSheet().replace(lightCss)

export class JokerCard extends MovableCard {
	static {
		if (window.customElements.get('joker-card') === undefined) {
			window.customElements.define('joker-card', JokerCard)
			document.adoptedStyleSheets.push(lightStyleSheet)
		}
	}

	#jokerName: JokerName = '8 Ball'
	#count = 1
	#edition: JokerEdition = 'Base'
	#plusChips = 0
	#plusMultiplier = 0
	#timesMultiplier = 1
	#active = true
	#rank: Rank = 'Ace'
	#suit: Suit = 'Clubs'

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

	constructor (joker?: Pick<Joker, 'name' | 'edition' | 'plusChips' | 'plusMultiplier' | 'timesMultiplier' | 'active' | 'count' | 'rank' | 'suit'>) {
		super()

		if (!this.id) {
			this.id = `${this.tagName.toLowerCase()}-${this.uniqueId}`
		}
		this.classList.add('card')
		this.draggable = true
		this.tabIndex = 0
		this.role = 'group'
		this.setAttribute('aria-labelledby', `${this.tagName.toLowerCase()}-${this.uniqueId}-title`)

		if (joker) {
			this.jokerName = joker.name
			this.count = joker.count
			this.edition = joker.edition
			this.plusChips = joker.plusChips
			this.plusMultiplier = joker.plusMultiplier
			this.timesMultiplier = joker.timesMultiplier
			this.active = joker.active
			if (joker.rank) {
				this.rank = joker.rank
			}
			if (joker.suit) {
				this.suit = joker.suit
			}
		} else {
			this.#syncSuitColorClass()
		}

		this.#syncActiveClass()

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

	get jokerName () {
		return this.#jokerName
	}

	set jokerName (jokerName) {
		this.#jokerName = jokerName

		const definition = JOKER_DEFINITIONS[this.jokerName]
		this.classList[definition.hasPlusChipsInput ? 'add' : 'remove']('--has-plus-chips')
		this.classList[definition.hasPlusMultiplierInput ? 'add' : 'remove']('--has-plus-multiplier')
		this.classList[definition.hasTimesMultiplierInput ? 'add' : 'remove']('--has-times-multiplier')
		this.classList[definition.hasIsActiveInput ? 'add' : 'remove']('--has-is-active')
		this.classList[definition.hasRankInput ? 'add' : 'remove']('--has-rank')
		this.classList[definition.hasSuitInput ? 'add' : 'remove']('--has-suit')

		this.#syncActiveClass()
		this.queueRender()
	}

	get count () {
		return this.#count
	}

	set count (count) {
		this.#count = count

		this.queueRender()
	}

	get edition () {
		return this.#edition
	}

	set edition (edition) {
		this.#edition = edition

		this.queueRender()
	}

	get plusChips () {
		return this.#plusChips
	}

	set plusChips (plusChips) {
		this.#plusChips = plusChips

		this.queueRender()
	}

	get plusMultiplier () {
		return this.#plusMultiplier
	}

	set plusMultiplier (plusMultiplier) {
		this.#plusMultiplier = plusMultiplier

		this.queueRender()
	}

	get timesMultiplier () {
		return this.#timesMultiplier
	}

	set timesMultiplier (timesMultiplier) {
		this.#timesMultiplier = timesMultiplier

		this.queueRender()
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

	get active () {
		return this.#active
	}

	set active (active) {
		this.#active = active

		this.#syncActiveClass()
		this.queueRender()
	}

	#syncActiveClass () {
		const isInactive = JOKER_DEFINITIONS[this.#jokerName].hasIsActiveInput && !this.#active
		this.classList[isInactive ? 'add' : 'remove']('--is-inactive')
	}

	toString () {
		const modifiers = [this.edition !== 'Base' ? this.edition : undefined].filter((modifier) => modifier !== undefined)
		const modifierText = modifiers.length > 0 ? ` (${modifiers.map((modifier) => termEdition(modifier)).join(', ')})` : ''

		if (getLang() === 'zh') {
			return `小丑 ${this.index + 1}：${term(this.jokerName)}${modifierText}`
		}

		return `Joker ${this.index + 1}: ${this.jokerName}${modifierText}`
	}

	template () {
		const definition = JOKER_DEFINITIONS[this.jokerName]

		return html`
			<div class="stack">
				<div class="action-list jc-action-list">
					<button
						class="button --icon"
						?disabled="${this.previousElementSibling === null}"
						type="button"
						@click="${this.swapLeft}"
					>
						<span class="visually-hidden">${t('moveJokerLeft')}</span>

						<svg class="icon">
							<use xlink:href="#arrow-left-icon"></use>
						</svg>
					</button>

					<label class="jc-is-active checkbox-control">
						<input
							name="joker-active-${this.uniqueId}"
							class="jc-is-active-input"
							type="checkbox"
							value="is-active"
							checked
							.checked="${this.active}"
							aria-label="${t('active')}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.active = input.checked
							}}"
						>

						<span class="jc-active-label" aria-hidden="true">${t('activeLabel')}</span>
					</label>

					<button
						class="button --icon push-inline-start"
						type="button"
						@click="${() => this.remove()}"
					>
						<span class="visually-hidden">${t('removeJoker')}</span>

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
						<span class="visually-hidden">${t('moveJokerRight')}</span>

						<svg class="icon">
							<use xlink:href="#arrow-right-icon"></use>
						</svg>
					</button>
				</div>

				<span id="${this.tagName.toLowerCase()}-${this.uniqueId}-title" class="visually-hidden">${this.toString()}</span>

				<div class="action-list jc-name-row">
					<label>
						<span class="visually-hidden">${t('jokerName')}</span>

						<combo-box
							id="joker-name-${this.uniqueId}"
							name="joker-name-${this.uniqueId}"
							class="jc-name-input"
							value="8 Ball"
							.value="${this.jokerName}"
							options-json="jokersJson"
							button-label="${t('showJokerOptions')}"
							input-label="${t('filterJokers')}"
							listbox-label="${t('jokers')}"
							@change="${(event: Event) => {
								const combo = event.currentTarget as HTMLInputElement
								if (event.target !== combo) {
									return
								}
								this.jokerName = combo.value as JokerName
							}}"
						></combo-box>
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
						<span class="visually-hidden">${t('duplicateJoker')}</span>

						<svg class="icon">
							<use xlink:href="#copy-icon"></use>
						</svg>
					</button>
				</div>

				<div class="jc-edition-row">
					<label class="jc-edition control-box --flat --grow">
						<span class="label truncate">${t('edition')}</span>

						<select
							id="joker-edition-${this.uniqueId}"
							name="joker-edition-${this.uniqueId}"
							.value="${this.edition}"
							class="jc-edition-input select"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.edition = input.value as JokerEdition
							}}"
						>
							<option value="Base" selected>${termEdition('Base')}</option>
							<option value="Foil">${termEdition('Foil')}</option>
							<option value="Holographic">${termEdition('Holographic')}</option>
							<option value="Polychrome">${termEdition('Polychrome')}</option>
							<option value="Negative">${termEdition('Negative')}</option>
						</select>
					</label>

					<label class="jc-plus-chips control-box --flat --grow">
						<span class="label truncate">${t('plusChips')}</span>

						<input
							name="joker-plusChips-${this.uniqueId}"
							class="jc-plus-chips-input text-input"
							type="number"
							value="0"
							.value="${this.plusChips}"
							min="0"
							step="${definition.plusChipsStep ?? 1}"
							?disabled="${!definition.hasPlusChipsInput}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.plusChips = Number(input.value)
							}}"
						>
					</label>

					<label class="jc-plus-multiplier control-box --flat --grow">
						<span class="label truncate">${t('plusMult')}</span>

						<input
							name="joker-plusMultiplier-${this.uniqueId}"
							class="jc-plus-multiplier-input text-input"
							type="number"
							value="0"
							.value="${this.plusMultiplier}"
							min="0"
							step="${definition.plusMultiplierStep ?? 1}"
							?disabled="${!definition.hasPlusMultiplierInput}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.plusMultiplier = Number(input.value)
							}}"
						>
					</label>

					<label class="jc-times-multiplier control-box --flat --grow">
						<span class="label truncate">${t('timesMult')}</span>

						<input
							name="joker-timesMultiplier-${this.uniqueId}"
							class="jc-times-multiplier-input text-input"
							type="number"
							value="1"
							.value="${this.timesMultiplier}"
							min="1"
							step="${definition.timesMultiplierStep ?? 1}"
							?disabled="${!definition.hasTimesMultiplierInput}"
							@change="${(event: Event) => {
								const input = event.target as HTMLInputElement
								this.timesMultiplier = Number(input.value)
							}}"
						>
					</label>
				</div>

				<div class="jc-card input-list">
					<label class="jc-rank">
						<span class="visually-hidden">${t('rank')}</span>

						<select
							id="joker-rank-${this.uniqueId}"
							name="joker-rank-${this.uniqueId}"
							class="jc-rank-input select"
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

					<span class="jc-card-of">${t('of')}</span>

					<label class="jc-suit">
						<span class="visually-hidden">${t('suit')}</span>

						<select
							id="joker-suit-${this.uniqueId}"
							name="joker-suit-${this.uniqueId}"
							class="jc-suit-input select"
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
				</div>

				<button
					class="button --icon jc-remove-button card-remove-button"
					type="button"
					@click="${() => this.remove()}"
				>
					<span class="visually-hidden">${t('removeJoker')}</span>

					<svg class="icon">
						<use xlink:href="#trash-icon"></use>
					</svg>
				</button>
			</div>
		`
	}

	duplicateInPlace (count = 1) {
		const copies = document.createDocumentFragment()

		for (let index = 0; index < count; index++) {
			copies.append(this.clone())
		}

		this.after(copies)
	}

	clone () {
		return new JokerCard({
			name: this.jokerName,
			edition: this.edition,
			plusChips: this.plusChips,
			plusMultiplier: this.plusMultiplier,
			timesMultiplier: this.timesMultiplier,
			active: this.active,
			count: this.count,
			rank: this.rank,
			suit: this.suit,
		})
	}
}
