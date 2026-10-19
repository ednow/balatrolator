const MOBILE_UI_CHANGE_EVENT = 'balatrolator:mobile-ui'

const NARROW_VIEWPORT_MEDIA = '(max-width: 48rem)'

function isPhoneUserAgent (): boolean {
	const ua = navigator.userAgent

	return /iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua)
		|| /Android/i.test(ua) && /Mobile/i.test(ua)
}

export function isMobileUi (): boolean {
	return window.matchMedia(NARROW_VIEWPORT_MEDIA).matches || isPhoneUserAgent()
}

function syncMobileUiClass (): boolean {
	const active = isMobileUi()
	document.documentElement.classList.toggle('mobile-ui', active)
	return active
}

export function initMobileUi (onChange?: () => void) {
	const notify = () => {
		syncMobileUiClass()
		onChange?.()
		window.dispatchEvent(new CustomEvent(MOBILE_UI_CHANGE_EVENT))
	}

	syncMobileUiClass()
	window.matchMedia(NARROW_VIEWPORT_MEDIA).addEventListener('change', notify)
}
