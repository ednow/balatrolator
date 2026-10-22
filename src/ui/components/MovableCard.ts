import { isMobileUi } from '../mobileUi.ts'
import { BaseElement } from './BaseElement.ts'

const registeredContainers = new Set<Element>()
let isDragging = false
const FORMAT_PREFIX = 'dragged-element-id:'
const DUPLICATE_LONG_PRESS_DURATION_MS = 500
const REMOVE_LONG_PRESS_DURATION_MS = 500
const LONG_PRESS_TOLERANCE_PX = 10
const TOUCH_DRAG_START_DISTANCE_PX = 10

let lastDraggedElId: string | null = null

interface PointerOrigin {
	x: number
	y: number
}

export abstract class MovableCard extends BaseElement {
	#container: HTMLElement | undefined
	#duplicatePressTimer: ReturnType<typeof setTimeout> | undefined
	#duplicateLongPressed = false

	#removePressTimer: ReturnType<typeof setTimeout> | undefined
	#pressOrigin: PointerOrigin | undefined
	#pressPointerId: number | undefined
	#removeArmed = false
	#suppressNextClick = false
	#dragPointerId: number | undefined
	#pointerDragging = false
	#dragClickTimer: ReturnType<typeof setTimeout> | undefined

	constructor () {
		super()

		this.addEventListener('dragstart', this.#handleDragStart)
		this.addEventListener('dragend', this.#handleDragEnd)
		this.addEventListener('drop', this.#handleDrop)
		this.addEventListener('pointerdown', this.#handlePointerDown)
		this.addEventListener('pointermove', this.#handlePointerMove, { passive: false })
		this.addEventListener('pointerup', this.#handlePointerUp)
		this.addEventListener('pointercancel', this.#handlePointerUp)
		this.addEventListener('pointerleave', this.#handlePointerLeave)
		this.addEventListener('touchend', this.#handleTouchEnd, { capture: true, passive: false })
		this.addEventListener('contextmenu', this.#handleContextMenu)
	}

	connectedCallback () {
		super.connectedCallback()

		if (!this.isConnected) {
			return
		}

		document.addEventListener('pointerdown', this.#handleDocumentPointerDown, true)
		document.addEventListener('pointermove', this.#handleDragPointerMove, { capture: true, passive: false })
		document.addEventListener('pointerup', this.#handleDragPointerEnd, true)
		document.addEventListener('pointercancel', this.#handleDragPointerEnd, true)
		document.addEventListener('click', this.#handleDragClick, true)

		const container = this.parentElement
		if (!container) {
			throw new Error(`<${this.tagName.toLowerCase()} id="${this.id}"> “parentElement” is not available.`)
		}
		this.#container = container

		if (!registeredContainers.has(this.#container)) {
			registeredContainers.add(this.#container)
			this.#container.addEventListener('dragenter', this.#handleDragOver)
			this.#container.addEventListener('dragover', this.#handleDragOver)
		}
	}

	disconnectedCallback () {
		super.disconnectedCallback()

		document.removeEventListener('pointerdown', this.#handleDocumentPointerDown, true)
		document.removeEventListener('pointermove', this.#handleDragPointerMove, true)
		document.removeEventListener('pointerup', this.#handleDragPointerEnd, true)
		document.removeEventListener('pointercancel', this.#handleDragPointerEnd, true)
		document.removeEventListener('click', this.#handleDragClick, true)
		this.#cancelDuplicatePress()
		this.#cancelPress()
		this.#finishPointerDrag()
		this.#clearDragClickSuppression()
		this.#setRemoveArmed(false)

		if (this.#container) {
			registeredContainers.delete(this.#container)
			this.#container.removeEventListener('dragenter', this.#handleDragOver)
			this.#container.removeEventListener('dragover', this.#handleDragOver)
			this.#container = undefined
		}
	}

	abstract duplicateInPlace (count: number): void

	duplicatePointerDown = (event: PointerEvent) => {
		if (event.button !== 0) {
			return
		}

		this.#cancelDuplicatePress()
		this.#duplicateLongPressed = false
		this.#duplicatePressTimer = setTimeout(() => {
			this.#duplicatePressTimer = undefined
			this.#duplicateLongPressed = true
			this.dispatchEvent(new CustomEvent('card-duplicate-long-press', { bubbles: true }))
		}, DUPLICATE_LONG_PRESS_DURATION_MS)
	}

	duplicatePointerUp = () => {
		this.#cancelDuplicatePress()
	}

	duplicateClick = () => {
		if (this.#duplicateLongPressed) {
			this.#duplicateLongPressed = false
			return
		}

		this.duplicateInPlace(1)
	}

	#cancelDuplicatePress () {
		if (this.#duplicatePressTimer !== undefined) {
			clearTimeout(this.#duplicatePressTimer)
			this.#duplicatePressTimer = undefined
		}
	}

	moveToStart = () => {
		if (
			this.#container?.firstElementChild instanceof BaseElement &&
			this.#container.firstElementChild !== this
		) {
			this.#move(this.#container.firstElementChild, 'beforebegin')
		}
	}

	moveToEnd = () => {
		if (
			this.#container?.lastElementChild instanceof BaseElement &&
			this.#container.lastElementChild !== this
		) {
			this.#move(this.#container.lastElementChild, 'afterend')
		}
	}

	swapLeft = () => {
		if (this.previousElementSibling instanceof BaseElement) {
			this.#move(this.previousElementSibling, 'beforebegin')
		}
	}

	swapRight = () => {
		if (this.nextElementSibling instanceof BaseElement) {
			this.#move(this.nextElementSibling, 'afterend')
		}
	}

	#move (referenceElement: BaseElement, where: InsertPosition) {
		referenceElement.insertAdjacentElement(where, this)
		this.focus()

		// Updates the “disabled” state of the “Move left”/“Move right” buttons.
		// Re-rendering only `referenceElement` and `this` is only sufficient when swapping adjacent elements. Otherwise, up to four elements must be re-rendered (e.g. when moving the last element to the start while there are at least four elements).
		for (const element of this.parentElement!.children) {
			if (element instanceof BaseElement) {
				element.queueRender()
			}
		}
	}

	#handleDocumentPointerDown = (event: PointerEvent) => {
		if (event.composedPath().includes(this)) {
			return
		}

		this.#setRemoveArmed(false)
		this.#clearDragClickSuppression()
	}

	#handlePointerDown = (event: PointerEvent) => {
		if (!isMobileUi() || event.button !== 0) {
			return
		}

		if (this.#removeArmed) {
			// Tapping the floating button itself must be left to the button’s click handler.
			if (isRemoveButton(event)) {
				return
			}

			this.#setRemoveArmed(false)
			this.#suppressNextClick = true
			return
		}

		this.#suppressNextClick = false
		this.#pressPointerId = event.pointerId
		this.#cancelPress()
		this.#pressOrigin = { x: event.clientX, y: event.clientY }

		// A swipe should be able to start on any control, and a long press anywhere on the card arms removal on touch devices.
		if (event.pointerType === 'mouse' && isInteractive(event)) {
			return
		}

		this.#removePressTimer = setTimeout(() => {
			this.#removePressTimer = undefined
			this.#pressOrigin = undefined
			this.#setRemoveArmed(true)
			this.#suppressNextClick = true
			navigator.vibrate?.(15)
		}, REMOVE_LONG_PRESS_DURATION_MS)
	}

	#handlePointerMove = (event: PointerEvent) => {
		if (this.#pointerDragging) {
			return
		}

		const origin = this.#pressOrigin
		if (event.pointerId !== this.#pressPointerId || origin === undefined) {
			return
		}

		const deltaX = event.clientX - origin.x
		const deltaY = event.clientY - origin.y
		if (Math.hypot(deltaX, deltaY) > LONG_PRESS_TOLERANCE_PX) {
			this.#cancelPress()
		}

		if (
			event.pointerType === 'mouse' ||
			this.#removeArmed ||
			Math.abs(deltaX) < TOUCH_DRAG_START_DISTANCE_PX ||
			Math.abs(deltaX) <= Math.abs(deltaY)
		) {
			return
		}

		event.preventDefault()
		this.#pointerDragging = true
		this.#dragPointerId = event.pointerId
		this.classList.add('--is-dragging')
		this.#suppressNextClick = true

		if (this.#container) {
			drop(this.#container, this, event.clientX)
		}
	}

	#handleDragPointerMove = (event: PointerEvent) => {
		if (!this.#pointerDragging || event.pointerId !== this.#dragPointerId) {
			return
		}

		event.preventDefault()
		if (this.#container) {
			drop(this.#container, this, event.clientX)
		}
	}

	#handleDragPointerEnd = (event: PointerEvent) => {
		if (!this.#pointerDragging || event.pointerId !== this.#dragPointerId) {
			return
		}

		this.#pressPointerId = undefined
		this.#cancelPress()
		this.#finishPointerDrag()
		this.#suppressDragClick()
	}

	#suppressDragClick () {
		if (this.#dragClickTimer !== undefined) {
			clearTimeout(this.#dragClickTimer)
		}
		this.#dragClickTimer = setTimeout(() => {
			this.#dragClickTimer = undefined
			this.#suppressNextClick = false
		}, 500)
	}

	#handleDragClick = (event: MouseEvent) => {
		if (!this.#suppressNextClick) {
			return
		}

		if (isRemoveButton(event)) {
			this.#suppressNextClick = false
			return
		}

		event.preventDefault()
		event.stopImmediatePropagation()
		this.#clearDragClickSuppression()
	}

	#clearDragClickSuppression () {
		if (this.#dragClickTimer !== undefined) {
			clearTimeout(this.#dragClickTimer)
			this.#dragClickTimer = undefined
		}

		this.#suppressNextClick = false
	}

	#handlePointerUp = (event: PointerEvent) => {
		if (event.pointerId !== this.#pressPointerId) {
			return
		}

		this.#finishPointerDrag()
		this.#cancelPress()
		this.#pressPointerId = undefined
	}

	#handlePointerLeave = () => {
		if (this.#pointerDragging) {
			return
		}

		this.#cancelPress()
	}

	#finishPointerDrag () {
		if (!this.#pointerDragging) {
			return
		}

		this.#pointerDragging = false
		this.classList.remove('--is-dragging')
		this.#dragPointerId = undefined

		if (this.#container) {
			for (const element of this.#container.children) {
				if (element instanceof BaseElement) {
					element.queueRender()
				}
			}
		}
	}

	#handleTouchEnd = (event: TouchEvent) => {
		// Keep a long press from also activating a select underneath the finger.
		if (this.#suppressNextClick && !isRemoveButton(event)) {
			event.preventDefault()
		}
	}

	#handleContextMenu = (event: Event) => {
		if (isMobileUi()) {
			event.preventDefault()
		}
	}

	#cancelPress () {
		if (this.#removePressTimer !== undefined) {
			clearTimeout(this.#removePressTimer)
			this.#removePressTimer = undefined
		}

		this.#pressOrigin = undefined
	}

	#setRemoveArmed (armed: boolean) {
		this.#removeArmed = armed
		this.classList[armed ? 'add' : 'remove']('--is-remove-armed')
	}

	#handleDragStart = (event: DragEvent) => {
		if (this.#pointerDragging) {
			event.preventDefault()
			return
		}

		this.#cancelPress()

		if (event.dataTransfer === null || !(event.target instanceof Element) || !this.#container) {
			return
		}

		const draggedEl = Array.from(this.#container.children).find((el) => el === event.target)
		if (draggedEl) {
			isDragging = true
			event.dataTransfer.effectAllowed = 'move'
			event.dataTransfer.dropEffect = 'move'
			// Dirty workaround: Store the drag'n'drop data in the format to get around browser security measures that prevent reading the data in event types other than `drop`.
			event.dataTransfer.setData(`${FORMAT_PREFIX}${draggedEl.id}`, draggedEl.id)
		}
	}

	#handleDragEnd = (event: DragEvent) => {
		if (!this.#container) {
			return
		}

		const draggedEl = getDragEventData(event, this.#container)
		if (draggedEl) {
			drop(this.#container, draggedEl, event.clientX)
			for (const node of this.#container.children) {
				if (node instanceof BaseElement) {
					node.queueRender()
				}
			}
			isDragging = false
		}
	}

	#handleDragOver = (event: DragEvent) => {
		if (!this.#container) {
			return
		}

		const draggedEl = getDragEventData(event, this.#container)
		if (draggedEl) {
			// **Allow** dropping off an element to occur
			event.preventDefault()
			// Safari workaround: Store the drag event data during the dragover event to work around an issue in Safari that makes it impossible to read `event.dataTransfer.types` during the dragend event.
			lastDraggedElId = draggedEl.id
		}
	}

	#handleDrop = (event: DragEvent) => {
		if (isDragging) {
			event.preventDefault()
		}
	}
}

function isRemoveButton (event: Event): boolean {
	const target = event.target
	return target instanceof Element && target.closest('.card-remove-button') !== null
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

function getDragEventData (event: DragEvent, container: Element): Element | null {
	if (event.dataTransfer === null || !(event.target instanceof Element)) {
		return null
	}

	// Dirty workaround: Read data from the format key instead of using `getData`.
	const format = event.dataTransfer.types.find((format) => format.startsWith(FORMAT_PREFIX))
	const draggedElId = format ? format.substring(FORMAT_PREFIX.length) : lastDraggedElId
	lastDraggedElId = null

	if (draggedElId && container) {
		const draggedEl = Array.from(container.children).find((el) => el.id === draggedElId)
		if (draggedEl) {
			return draggedEl
		}
	}

	return null
}

function drop (container: Element, draggedEl: Element, dragClientX: number) {
	// Determining the insertion coordinate for the element …
	const containerRect = container.getBoundingClientRect()
	// The drop target X coordinate relative to the container.
	const dropTargetX = dragClientX - containerRect.left

	for (const el of container.children) {
		if (el === draggedEl) {
			continue
		}

		const { left, width } = el.getBoundingClientRect()
		// The element's X coordinate relative to the container.
		const elStartX = left - containerRect.left
		// The element's halfway point X coordinate relative the container.
		const halfwayPointX = elStartX + width / 2

		if (dropTargetX < halfwayPointX) {
			if (draggedEl.nextElementSibling === el) {
				return
			}

			el.insertAdjacentElement('beforebegin', draggedEl)
			return
		}
	}

	if (container.lastElementChild === draggedEl) {
		return
	}

	container.insertAdjacentElement('beforeend', draggedEl)
}
