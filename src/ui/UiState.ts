import { LANGUAGE_CHANGE_EVENT, getLang, t, term } from './i18n.ts'
import { describeGameState } from './describeGameState.ts'
import { formatScoreValueForUi } from './scoreLogFormat.ts'
import { initMobileUi, isMobileUi } from './mobileUi.ts'
import './components/ComboBox.ts'

import { getState } from '#lib/getState.ts'
import { calculateScore } from '#lib/calculateScore.ts'
import { JOKER_DEFINITIONS, LUCKS } from '#lib/data.ts'
import type { ComboBox } from './components/ComboBox.ts'
import { HandLevelCard } from './components/HandLevelCard.ts'
import { JokerCard } from './components/JokerCard.ts'
import { PlayingCard } from './components/PlayingCard.ts'
import { debounce } from './debounce.ts'
import { readStateFromUrl, saveStateToUrl, WebStorage } from './Storage.ts'
import { SaveManager } from './SaveManager.ts'
import type { BlindName, Card, DeckName, HandName, InitialState, Joker, State, Result, InitialJoker, InitialCard, Luck } from '#lib/types.ts'

function createDateTimeFormat () {
	return new Intl.DateTimeFormat(document.documentElement.lang, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		hour12: false,
		minute: 'numeric',
		second: 'numeric',
	})
}

let dateTimeFormat = createDateTimeFormat()

const saveManager = new SaveManager()

const form = document.querySelector<HTMLFormElement>('[data-form]')!
form.addEventListener('submit', (event) => {
	event.preventDefault()
	const state = readStateFromUi()
	applyState(state)
})
form.addEventListener('change', () => calculate())

const liveRegion = document.querySelector<HTMLElement>('[aria-live="polite"]')!
function ariaNotify (message: string) {
	liveRegion.innerText = message
}

const debouncedAriaNotify = debounce(ariaNotify, 1_000)

const handsInput = form.querySelector<HTMLInputElement>('[name="hands"]')!
const discardsInput = form.querySelector<HTMLInputElement>('[name="discards"]')!
const moneyInput = form.querySelector<HTMLInputElement>('[name="money"]')!

const blindNameInput = form.querySelector<ComboBox>('[name="blindName"]')!
const blindIsActiveCheckbox = form.querySelector<HTMLInputElement>('[name="blindIsActive"]')!

const deckInput = form.querySelector<ComboBox>('[name="deck"]')!

const observatoryInputs = form.querySelectorAll<HTMLInputElement>('[data-r-observatory-hand]')
const jokerSlotsInput = form.querySelector<HTMLInputElement>('[name="jokerSlots"]')!

const handLevelContainer = form.querySelector<HTMLElement>('[data-h-container]')!

const jokerContainer = form.querySelector<HTMLElement>('[data-j-container]')!
function isCardListBlankAreaClick (event: Event) {
	return !(event.target as Element).closest('joker-card, playing-card')
}

jokerContainer.addEventListener('dblclick', (event) => {
	if (!isCardListBlankAreaClick(event)) {
		return
	}

	addJoker()
})

const playingCardContainer = form.querySelector<HTMLElement>('[data-c-container]')!
playingCardContainer.addEventListener('dblclick', (event) => {
	if (!isCardListBlankAreaClick(event)) {
		return
	}

	addPlayingCard()
})

const scoreCardContainer = form.querySelector<HTMLElement>('[data-sc-container]')!
const playedHandEl = form.querySelector<HTMLElement>('[data-sc-played-hand]')!
const scoreLogEl = form.querySelector<HTMLPreElement>('[data-sc-log]')!
const scoreFabEl = document.querySelector<HTMLButtonElement>('[data-sc-fab]')!
const scoreFabLuckEl = document.querySelector<HTMLElement>('[data-sc-fab-luck]')!
const scoreFabValueEl = document.querySelector<HTMLElement>('[data-sc-fab-score]')!

const SCORE_FAB_LONG_PRESS_MS = 500
const SCORE_FAB_MARGIN_PX = 16
const SCORE_FAB_DRAG_THRESHOLD_PX = 8
const SCORE_FAB_ANCHOR_STORAGE_KEY = 'score-fab-anchor'

type ScoreFabSide = 'left' | 'right'

interface ScoreFabAnchor {
	side: ScoreFabSide
	top: number
}

let selectedLuck: Luck = 'none'
let lastScoreHand: HandName = 'High Card'
let lastScoreResults: Result[] = []

function calculateScoreFromUi (state: State) {
	return calculateScore(state, { formatScoreValue: formatScoreValueForUi })
}

async function copyCurrentStateDescription () {
	const state = readStateFromUi()
	let hand: HandName | undefined
	let results: Result[] | undefined
	if (form.checkValidity()) {
		const scored = calculateScoreFromUi(state)
		hand = scored.hand
		results = scored.results
	}

	const text = describeGameState(state, hand, results)
	try {
		await navigator.clipboard.writeText(text)
		ariaNotify(t('copyStateSuccess'))
	} catch {
		ariaNotify(t('copyStateFailed'))
	}
}

for (const resetButton of form.querySelectorAll<HTMLButtonElement>('[data-sc-reset-button]')) {
	resetButton.addEventListener('click', () => {
		populateUiWithState(getState({}))
	})
}

const saveRowTemplate = document.querySelector<HTMLTemplateElement>('template#save-row')!
const saveForm = document.querySelector<HTMLFormElement>('[data-s-form]')!
saveForm.addEventListener('submit', (event) => handleSaveSubmit(event))
const importForm = document.querySelector<HTMLFormElement>('[data-s-import-form]')!
importForm.addEventListener('submit', (event) => handleImportSubmit(event))

for (const dialog of document.querySelectorAll('dialog')) {
	for (const button of dialog.querySelectorAll('button[data-modal-close-button]')) {
		if (button instanceof HTMLButtonElement) {
			button.addEventListener('click', () => {
				dialog.removeAttribute('data-duplicate-target-id')
				dialog.close()
			})
		}
	}
}

// Re-calculate score after re-ordering cards
const handleMutation: MutationCallback = (mutationList) => {
	if (mutationList.some(({ type }) => type === 'childList')) {
		calculate()
	}
}

const mutationObserver = new MutationObserver(handleMutation)
mutationObserver.observe(jokerContainer, { childList: true })
mutationObserver.observe(playingCardContainer, { childList: true })

function luckLabel (luck: Luck) {
	if (luck === 'none') {
		return t('luckNone')
	}

	if (luck === 'all') {
		return t('luckAll')
	}

	return t('luckAverage')
}

function cycleSelectedLuck () {
	const luckIndex = LUCKS.indexOf(selectedLuck)
	selectedLuck = LUCKS[(luckIndex + 1) % LUCKS.length]!
	renderScoreUi(lastScoreHand, lastScoreResults)
}

function updateScoreFab (result: Result) {
	scoreFabEl.classList.remove('score-fab--luck-none', 'score-fab--luck-average', 'score-fab--luck-all')
	scoreFabEl.classList.add(`score-fab--luck-${result.luck}`)
	scoreFabLuckEl.textContent = luckLabel(result.luck)
	scoreFabValueEl.textContent = result.formattedScore
}

function readScoreFabAnchor (): ScoreFabAnchor | null {
	try {
		const stored = WebStorage.get(SCORE_FAB_ANCHOR_STORAGE_KEY)
		if (stored === null) {
			return null
		}

		const parsed = JSON.parse(stored) as ScoreFabAnchor
		if (parsed.side !== 'left' && parsed.side !== 'right') {
			return null
		}

		if (!Number.isFinite(parsed.top)) {
			return null
		}

		return parsed
	} catch {
		return null
	}
}

function storeScoreFabAnchor (anchor: ScoreFabAnchor) {
	WebStorage.set(SCORE_FAB_ANCHOR_STORAGE_KEY, JSON.stringify(anchor))
}

function clampScoreFabTop (top: number) {
	const maxTop = window.innerHeight - scoreFabEl.offsetHeight - SCORE_FAB_MARGIN_PX
	return Math.min(Math.max(SCORE_FAB_MARGIN_PX, top), maxTop)
}

function applyScoreFabPosition (side: ScoreFabSide, top: number) {
	const clampedTop = clampScoreFabTop(top)
	const left = side === 'left'
		? SCORE_FAB_MARGIN_PX
		: window.innerWidth - scoreFabEl.offsetWidth - SCORE_FAB_MARGIN_PX

	scoreFabEl.style.inset = 'auto'
	scoreFabEl.style.left = `${left}px`
	scoreFabEl.style.top = `${clampedTop}px`
	scoreFabEl.style.right = 'auto'
	scoreFabEl.style.bottom = 'auto'
	scoreFabEl.dataset.fabSide = side

	storeScoreFabAnchor({ side, top: clampedTop })
}

function defaultScoreFabAnchor (): ScoreFabAnchor {
	return {
		side: 'right',
		top: window.innerHeight - scoreFabEl.offsetHeight - SCORE_FAB_MARGIN_PX,
	}
}

function restoreScoreFabPosition () {
	if (!isMobileUi()) {
		return
	}

	const anchor = readScoreFabAnchor() ?? defaultScoreFabAnchor()
	applyScoreFabPosition(anchor.side, anchor.top)
}

function snapScoreFabToSide () {
	const rect = scoreFabEl.getBoundingClientRect()
	const centerX = rect.left + rect.width / 2
	const side: ScoreFabSide = centerX < window.innerWidth / 2 ? 'left' : 'right'
	applyScoreFabPosition(side, rect.top)
}

function initScoreFab () {
	let longPressTimer: ReturnType<typeof setTimeout> | undefined
	let suppressNextClick = false
	let dragPointerId: number | undefined
	let dragStartX = 0
	let dragStartY = 0
	let dragOffsetX = 0
	let dragOffsetY = 0
	let isDraggingFab = false

	const cancelLongPress = () => {
		if (longPressTimer !== undefined) {
			clearTimeout(longPressTimer)
			longPressTimer = undefined
		}
	}

	const resetDrag = () => {
		dragPointerId = undefined
		isDraggingFab = false
	}

	restoreScoreFabPosition()
	window.addEventListener('resize', () => {
		if (!isMobileUi()) {
			return
		}

		const side = scoreFabEl.dataset.fabSide === 'left' ? 'left' : 'right'
		const stored = readScoreFabAnchor()
		applyScoreFabPosition(side, stored?.top ?? defaultScoreFabAnchor().top)
	})

	scoreFabEl.addEventListener('pointerdown', (event) => {
		if (!isMobileUi()) {
			return
		}

		if (event.pointerType === 'mouse' && event.button !== 0) {
			return
		}

		const rect = scoreFabEl.getBoundingClientRect()
		dragPointerId = event.pointerId
		dragStartX = event.clientX
		dragStartY = event.clientY
		dragOffsetX = event.clientX - rect.left
		dragOffsetY = event.clientY - rect.top
		isDraggingFab = false

		suppressNextClick = false
		cancelLongPress()
		longPressTimer = setTimeout(() => {
			longPressTimer = undefined
			if (!isDraggingFab) {
				suppressNextClick = true
				cycleSelectedLuck()
			}
		}, SCORE_FAB_LONG_PRESS_MS)

		scoreFabEl.setPointerCapture(event.pointerId)
	})

	scoreFabEl.addEventListener('pointermove', (event) => {
		if (dragPointerId !== event.pointerId) {
			return
		}

		const deltaX = event.clientX - dragStartX
		const deltaY = event.clientY - dragStartY

		if (!isDraggingFab && (Math.abs(deltaX) > SCORE_FAB_DRAG_THRESHOLD_PX || Math.abs(deltaY) > SCORE_FAB_DRAG_THRESHOLD_PX)) {
			isDraggingFab = true
			cancelLongPress()
		}

		if (!isDraggingFab) {
			return
		}

		const fabWidth = scoreFabEl.offsetWidth
		const fabHeight = scoreFabEl.offsetHeight
		const left = Math.min(
			Math.max(0, event.clientX - dragOffsetX),
			window.innerWidth - fabWidth,
		)
		const top = Math.min(
			Math.max(0, event.clientY - dragOffsetY),
			window.innerHeight - fabHeight,
		)

		scoreFabEl.style.inset = 'auto'
		scoreFabEl.style.left = `${left}px`
		scoreFabEl.style.top = `${top}px`
		scoreFabEl.style.right = 'auto'
		scoreFabEl.style.bottom = 'auto'
	})

	const finishPointer = (event: PointerEvent) => {
		if (dragPointerId !== event.pointerId) {
			return
		}

		cancelLongPress()

		if (isDraggingFab) {
			snapScoreFabToSide()
			suppressNextClick = true
		}

		resetDrag()

		if (scoreFabEl.hasPointerCapture(event.pointerId)) {
			scoreFabEl.releasePointerCapture(event.pointerId)
		}
	}

	scoreFabEl.addEventListener('pointerup', finishPointer)
	scoreFabEl.addEventListener('pointercancel', finishPointer)

	scoreFabEl.addEventListener('click', (event) => {
		if (!suppressNextClick) {
			return
		}

		event.preventDefault()
		event.stopImmediatePropagation()
		suppressNextClick = false
	}, true)
}

const MOBILE_PANEL_HISTORY_KEY = 'balatrolatorMobilePanel'

let mobilePanelOnHistoryStack = false
let skipMobilePanelPopstate = false

function closeMobilePanelsUi () {
	for (const panel of document.querySelectorAll('[data-mobile-panel]')) {
		panel.classList.remove('--mobile-open')
	}
	document.body.classList.remove('mobile-panel-open')
}

function syncMobilePanelHistoryOnDismiss () {
	if (!mobilePanelOnHistoryStack) {
		return
	}

	mobilePanelOnHistoryStack = false

	if (!isMobileUi()) {
		return
	}

	skipMobilePanelPopstate = true
	history.back()
}

function closeMobilePanels () {
	const hadOpenPanel = document.querySelector('[data-mobile-panel].--mobile-open') !== null
	closeMobilePanelsUi()

	if (hadOpenPanel) {
		syncMobilePanelHistoryOnDismiss()
	}
}

function openMobilePanel (id: string) {
	for (const panel of document.querySelectorAll('[data-mobile-panel]')) {
		panel.classList.remove('--mobile-open')
	}

	const panel = document.querySelector<HTMLElement>(`[data-mobile-panel="${id}"]`)
	panel?.classList.add('--mobile-open')
	document.body.classList.add('mobile-panel-open')

	if (!isMobileUi()) {
		return
	}

	const state = { [MOBILE_PANEL_HISTORY_KEY]: id }

	if (mobilePanelOnHistoryStack) {
		history.replaceState(state, '')
	} else {
		history.pushState(state, '')
		mobilePanelOnHistoryStack = true
	}
}

function initMobileBackGesture () {
	window.addEventListener('popstate', () => {
		if (skipMobilePanelPopstate) {
			skipMobilePanelPopstate = false
			return
		}

		if (!mobilePanelOnHistoryStack) {
			return
		}

		mobilePanelOnHistoryStack = false
		closeMobilePanelsUi()
	})
}

function initMobilePanels () {
	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mobile-panel-open]')) {
		button.addEventListener('click', () => {
			const id = button.getAttribute('data-mobile-panel-open')
			if (id) {
				openMobilePanel(id)
			}
		})
	}

	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mobile-panel-close]')) {
		button.addEventListener('click', () => closeMobilePanels())
	}
}

function onMobileUiChange () {
	closeMobilePanelsUi()

	if (mobilePanelOnHistoryStack) {
		if (isMobileUi()) {
			skipMobilePanelPopstate = true
			mobilePanelOnHistoryStack = false
			history.back()
		} else {
			mobilePanelOnHistoryStack = false
		}
	}

	if (isMobileUi()) {
		restoreScoreFabPosition()
	}

	if (lastScoreResults.length > 0) {
		renderScoreUi(lastScoreHand, lastScoreResults)
	}
}

export function init () {
	initMobileUi(onMobileUiChange)

	saveManager.retrieveStoredSaves()

	// Read the state from the URL first, then read it from web storage, and finally, fall back to the default/initial state.
	const state = readStateFromUrl() ?? saveManager.getAutoSave()?.state ?? getState({})
	populateUiWithState(state)

	populateSavesUi()
	initMobilePanels()
	initMobileBackGesture()
	initScoreFab()

	for (const copyStateButton of document.querySelectorAll<HTMLButtonElement>('[data-copy-state]')) {
		copyStateButton.addEventListener('click', () => {
			void copyCurrentStateDescription()
		})
	}

	window.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
		dateTimeFormat = createDateTimeFormat()
		populateSavesUi()
		if (form.checkValidity()) {
			const current = readStateFromUi()
			const { hand, results } = calculateScoreFromUi(current)
			updateScore(hand, results)
		}
	})
}

function calculate () {
	form.requestSubmit()
	if (form.checkValidity()) {
		for (const el of playingCardContainer.children) {
			if (el instanceof PlayingCard) {
				el.toggleBlindEffects(blindNameInput.value as BlindName, blindIsActiveCheckbox.checked)
			}
		}
	}
}

/**
 * Read saved hands from web storage and populate them in the UI.
 */
function populateSavesUi () {
	saveManager.retrieveStoredSaves()

	const savesContainer = document.querySelector<HTMLElement>('[data-s-saves]')!
	savesContainer.innerHTML = ''
	for (const save of saveManager.saves) {
		const fragment = saveRowTemplate.content.cloneNode(true) as Element

		const nameCell = fragment.querySelector<HTMLTableCellElement>('[data-s-name]')!
		const visibleName = save.autoSave && save.name === 'Current hand' ? t('currentHand') : save.name
		const name = document.createElement('b')
		name.textContent = visibleName
		nameCell.replaceChildren(name)
		if (save.autoSave) {
			nameCell.append(' ')
			const autosave = document.createElement('i')
			autosave.textContent = `(${t('autosave')})`
			nameCell.append(autosave)
		}

		const handCell = fragment.querySelector<HTMLTableCellElement>('[data-s-hand]')!
		handCell.textContent = term(save.hand)

		const scoreCell = fragment.querySelector<HTMLTableCellElement>('[data-s-score]')!
		const averageResult = save.results.find(({ luck }) => luck === 'average')
		scoreCell.innerHTML = averageResult!.formattedScore

		const timeCell = fragment.querySelector<HTMLTableCellElement>('[data-s-time]')!
		timeCell.innerText = dateTimeFormat.format(new Date(save.time))

		const loadButton = fragment.querySelector<HTMLButtonElement>('[data-s-load-button]')!
		loadButton.setAttribute('data-save-name', save.name)
		loadButton.addEventListener('click', (event) => loadSave(event))

		const deleteButton = fragment.querySelector<HTMLButtonElement>('[data-s-delete-button]')!
		deleteButton.setAttribute('data-save-name', save.name)
		deleteButton.addEventListener('click', (event) => deleteSave(event))

		const exportButton = fragment.querySelector<HTMLButtonElement>('[data-s-export-button]')!
		exportButton.setAttribute('data-save-name', save.name)
		exportButton.addEventListener('click', (event) => exportSave(event))

		savesContainer.appendChild(fragment)
	}
}

function loadSave (event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const name = button.getAttribute('data-save-name')!

	const { state } = saveManager.getSave(name)!
	populateUiWithState(state)
}

function handleSaveSubmit (event: SubmitEvent) {
	event.preventDefault()

	const state = readStateFromUi()
	const form = event.currentTarget as HTMLFormElement
	const formData = new FormData(form)
	const name = formData.get('name') as Exclude<FormDataEntryValue, File> | null ?? `Save ${saveManager.saves.length - 1}`

	const { hand, results } = calculateScoreFromUi(state)
	saveManager.save(name, state, hand, results)
	storeSaves()
}

/**
 * Delete a save.
 */
function deleteSave (event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const name = button.getAttribute('data-save-name')!
	saveManager.deleteSave(name)
	storeSaves()
}

function exportSave (event: Event) {
	const button = event.currentTarget as HTMLButtonElement
	const name = button.getAttribute('data-save-name')!
	const save = saveManager.getSave(name)!

	const blob = new Blob([JSON.stringify(save.state)], { type: 'application/json' })
	const objectUrl = window.URL.createObjectURL(blob)
	const link = Object.assign(document.createElement('a'), {
		download: `${save.name}.json`,
		href: objectUrl,
	})
	link.click()
	link.remove()
	window.URL.revokeObjectURL(objectUrl)
}

/**
 * Stores all saves in web storage and populates saves UI.
 */
function storeSaves () {
	saveManager.storeSaves()
	populateSavesUi()
}

function handleImportSubmit (event: SubmitEvent) {
	event.preventDefault()

	const form = event.currentTarget as HTMLFormElement
	const formData = new FormData(form)
	const file = formData.get('import') as File
	const fileReader = new FileReader()
	fileReader.addEventListener('load', () => {
		if (typeof fileReader.result === 'string') {
			const fileName = file.name.replace('.json', '')
			const existingSave = saveManager.getSave(fileName)
			const saveName = existingSave !== undefined ? `${fileName} copy` : fileName
			const state = JSON.parse(fileReader.result) as State
			state.jokerSet = new Set(state.jokers.map(({ name }) => name))
			const { hand, results } = calculateScoreFromUi(state)
			saveManager.save(saveName, state, hand, results)
			storeSaves()

			const input = form.querySelector('input[name="import"]')
			if (input instanceof HTMLInputElement) {
				input.value = ''
			}
		}
	})
	fileReader.readAsText(file)
}

function applyState (state: State) {
	const { hand, results } = calculateScoreFromUi(state)
	updateScore(hand, results)
	saveStateToUrl(state)

	// Save the current state as a special auto save overwriting the previous auto save.
	saveManager.autoSave(state, hand, results)
	storeSaves()
}

function appendScoreCard (result: Result) {
	const template = document.querySelector<HTMLTemplateElement>('template#score-card')!
	const fragment = template.content.cloneNode(true) as Element

	const luckEl = fragment.querySelector<HTMLElement>('[data-sc-luck]')!
	luckEl.textContent = luckLabel(result.luck)

	const formattedScoreEl = fragment.querySelector<HTMLElement>('[data-sc-formatted-score]')!
	formattedScoreEl.textContent = result.formattedScore

	const scoreEl = fragment.querySelector<HTMLElement>('[data-sc-score]')!
	const equation = `${result.chips}×${result.multiplier}`
	scoreEl.textContent = equation + '\n= ' + result.score

	scoreCardContainer.appendChild(fragment)
}

function renderScoreUi (hand: HandName, results: Result[]) {
	const resultsByScore = new Map<string, Result>()
	for (const result of results) {
		if (!resultsByScore.has(result.score)) {
			resultsByScore.set(result.score, result)
		}
	}

	playedHandEl.textContent = term(hand)

	scoreCardContainer.innerHTML = ''
	const displayResults = isMobileUi()
		? [results.find((result) => result.luck === selectedLuck) ?? results[0]!]
		: Array.from(resultsByScore.values())

	for (const result of displayResults) {
		appendScoreCard(result)
	}

	const resultArray = isMobileUi() ? results : Array.from(resultsByScore.values())

	let scoreAnnouncement
	const handName = term(hand)
	if (resultArray.length === 3) {
		const scoreLuckNone = results.find((result) => result.luck === 'none')!.formattedScore
		const scoreLuckAverage = results.find((result) => result.luck === 'average')!.formattedScore
		const scoreLuckAll = results.find((result) => result.luck === 'all')!.formattedScore
		scoreAnnouncement = getLang() === 'zh'
			? `${handName}，平均 ${scoreLuckAverage}，最佳 ${scoreLuckAll}，最差 ${scoreLuckNone}。`
			: `${hand} scoring ${scoreLuckAverage} on average, ${scoreLuckAll} in the best case, and ${scoreLuckNone} in the worst case.`
	} else {
		scoreAnnouncement = getLang() === 'zh'
			? `${handName}，得分 ${resultArray.at(0)!.formattedScore}。`
			: `${hand} scoring ${resultArray.at(0)!.formattedScore}.`
	}
	debouncedAriaNotify(scoreAnnouncement)

	if (isMobileUi()) {
		const active = results.find((result) => result.luck === selectedLuck) ?? results[0]!
		scoreLogEl.textContent = active.log.join('\n')
		updateScoreFab(active)
	} else {
		scoreLogEl.textContent = resultArray.map((result) => result.log.join('\n')).join('\n\n')
	}
}

function updateScore (hand: HandName, results: Result[]) {
	lastScoreHand = hand
	lastScoreResults = results
	renderScoreUi(hand, results)
}

/**
 * Assembles a `State` object from the various form elements in the UI.
 *
 * Inverse operation of `populateUiWithState`.
 */
function readStateFromUi (): State {
	const formData = new FormData(form)

	const hands = Number(formData.get('hands'))
	const discards = Number(formData.get('discards'))
	const money = Number(formData.get('money'))
	const blindName = formData.get('blindName') as BlindName
	const blindIsActive = formData.get('blindIsActive') === 'is-active'
	const deck = formData.get('deck') as DeckName
	const jokerSlots = Number(formData.get('jokerSlots'))

	const initialState: Required<InitialState> = {
		hands,
		discards,
		money,
		blind: {
			name: blindName,
			active: blindIsActive,
		},
		deck,
		observatory: {},
		handLevels: {},
		jokers: [],
		jokerSlots,
		cards: [],
	}

	for (const observatoryInput of observatoryInputs) {
		const handName = observatoryInput.getAttribute('data-r-observatory-hand') as HandName
		initialState.observatory[handName] = Number(observatoryInput.value)
	}

	for (const handLevel of handLevelContainer.children) {
		if (!(handLevel instanceof HandLevelCard)) continue

		initialState.handLevels[handLevel.handName] = {
			level: handLevel.level,
			plays: handLevel.plays,
		}
	}

	for (const jokerCard of jokerContainer.children) {
		if (!(jokerCard instanceof JokerCard)) continue

		const jokerDefinition = JOKER_DEFINITIONS[jokerCard.jokerName]
		const jokerEntry: InitialJoker = {
			name: jokerCard.jokerName,
			edition: jokerCard.edition,
			plusChips: jokerCard.plusChips,
			plusMultiplier: jokerCard.plusMultiplier,
			timesMultiplier: jokerCard.timesMultiplier,
			active: jokerCard.active,
			count: jokerCard.count,
		}
		if (jokerDefinition.hasRankInput) {
			jokerEntry.rank = jokerCard.rank
		}

		if (jokerDefinition.hasSuitInput) {
			jokerEntry.suit = jokerCard.suit
		}

		initialState.jokers.push(jokerEntry)
	}

	for (const playingCard of playingCardContainer.children) {
		if (!(playingCard instanceof PlayingCard)) continue

		initialState.cards.push({
			rank: playingCard.rank,
			suit: playingCard.suit,
			edition: playingCard.edition,
			enhancement: playingCard.enhancement,
			seal: playingCard.seal,
			debuffed: playingCard.debuffed,
			played: playingCard.played,
			count: playingCard.count,
		} satisfies Omit<Required<InitialCard>, 'index'>)
	}

	return getState(initialState)
}

/**
 * Populates the UI using a `State` object. Tries to retrieve this object from the URL or local storage.
 */
function populateUiWithState (state: State) {
	handsInput.value = String(state.hands)
	discardsInput.value = String(state.discards)
	moneyInput.value = String(state.money)
	blindNameInput.value = state.blind.name
	blindIsActiveCheckbox.checked = state.blind.active
	deckInput.value = state.deck
	jokerSlotsInput.value = String(state.jokerSlots)

	for (const observatoryInput of observatoryInputs) {
		const handName = observatoryInput.getAttribute('data-r-observatory-hand') as HandName
		observatoryInput.value = String(state.observatory[handName] ?? 0)
	}

	handLevelContainer.innerHTML = ''
	for (const [handName, handLevel] of Object.entries(state.handLevels)) {
		handLevelContainer.append(
			new HandLevelCard(handName as HandName, handLevel),
		)
	}

	jokerContainer.innerHTML = ''
	for (const joker of state.jokers) {
		addJoker(joker)
	}

	playingCardContainer.innerHTML = ''
	for (const card of state.cards) {
		addPlayingCard(card)
	}

	applyState(state)
}

function addJoker (joker?: Joker) {
	const el = new JokerCard(joker)
	jokerContainer.append(el)
}

function addPlayingCard (card?: Card) {
	const el = new PlayingCard(card)
	playingCardContainer.append(el)
	el.toggleBlindEffects(blindNameInput.value as BlindName, blindIsActiveCheckbox.checked)
}

