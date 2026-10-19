import { html } from 'lit-html'

import type { HandLevel, HandName } from '#lib/types.ts'
import { t, term } from '#ui/i18n.ts'
import { BaseElement } from './BaseElement.ts'

const lightCss = /*css*/`
	hand-level-card {
		display: block;
		inline-size: initial;
	}

	@media (prefers-contrast: more) {
		hand-level-card {
			--c-text: var(--c-black);
			--c-text-disabled: var(--c-grey-dark);
			--c-border: var(--c-black);
			--c-background-light: var(--c-grey-light);
			--c-background-lighter: var(--c-white);
		}
	}

	.hlc-fieldset {
		border: none;
		padding: 0;
		margin: 0;
		min-inline-size: 0;
	}

	.hlc-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-inline-size: 0;
	}

	.hlc-hand-name {
		font-weight: bold;
	}

	.hlc-level-input,
	.hlc-plays-input {
		text-align: end;
		inline-size: 2.5rem;
	}

	html.mobile-ui hand-level-card .hlc-row {
		flex-direction: row;
		align-items: center;
		gap: 0.35rem;
	}

	html.mobile-ui hand-level-card .hlc-hand-name {
		flex: 1 1 auto;
		min-inline-size: 0;
		font-size: 0.9em;
		font-weight: normal;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	html.mobile-ui hand-level-card .hlc-row .input-list {
		flex: 0 0 auto;
		flex-wrap: nowrap;
	}

	html.mobile-ui hand-level-card .hlc-row .input-list > * {
		flex: 0 0 auto;
	}
`
const lightStyleSheet = await new CSSStyleSheet().replace(lightCss)

export class HandLevelCard extends BaseElement {
	static {
		if (window.customElements.get('hand-level-card') === undefined) {
			window.customElements.define('hand-level-card', HandLevelCard)
			document.adoptedStyleSheets.push(lightStyleSheet)
		}
	}

	#handName
	#level
	#plays

	constructor (
		handName?: HandName,
		handLevel?: HandLevel,
	) {
		super()

		this.#handName = handName ?? 'High Card'
		this.#level = handLevel?.level ?? 1
		this.#plays = handLevel?.plays ?? 0
	}

	get handName () {
		return this.#handName
	}

	set handName (handName) {
		this.#handName = handName

		this.queueRender()
	}

	get level () {
		return this.#level
	}

	set level (level) {
		this.#level = level

		this.queueRender()
	}

	get plays () {
		return this.#plays
	}

	set plays (plays) {
		this.#plays = plays

		this.queueRender()
	}

	template () {
		return html`
			<fieldset class="hlc-fieldset">
				<legend class="visually-hidden">${term(this.handName)}</legend>

				<div class="hlc-row">
					<span class="hlc-hand-name">${term(this.handName)}</span>

					<div class="input-list">
						<label class="control-box --flat --grow">
							<span class="label">
								<span aria-hidden="true">${t('levelShort')}</span>
								<span class="visually-hidden">${t('level')}</span>
							</span>

							<input
								class="hlc-level-input text-input"
								type="number"
								value="1"
								.value="${this.level}"
								min="1"
								@change="${(event: Event) => {
									const input = event.target as HTMLInputElement
									this.level = Number(input.value)
								}}"
							>
						</label>

						<label class="hlc-plays control-box --flat --grow">
							<span class="label">
								<span aria-hidden="true">${t('playsShort')}</span>
								<span class="visually-hidden">${t('numberOfPlays')}</span>
							</span>

							<input
								class="hlc-plays-input text-input"
								type="number"
								value="0"
								.value="${this.plays}"
								min="0"
								@change="${(event: Event) => {
									const input = event.target as HTMLInputElement
									this.plays = Number(input.value)
								}}"
							>
						</label>
					</div>
				</div>
			</fieldset>
		`
	}
}
