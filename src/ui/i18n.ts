import { zhEditions, zhEnhancements, zhSealColors, zhSeals, zhTerms } from './zh-terms.ts'

export type Lang = 'en' | 'zh'

export const LANGUAGE_CHANGE_EVENT = 'balatrolator:lang'

const STORAGE_KEY = 'balatrolator-lang'

const en = {
	title: 'Balatrolator – Balatro calculator',
	description: 'Figure out how best to score by comparing variations of your Balatro hand before playing it.',
	language: 'Language',
	intro: 'Balatrolator is a score calculator for <a href="https://www.playbalatro.com/">Balatro</a>. Go, buy the game!',
	contribute: 'Please, <a href="https://github.com/kleinfreund/balatrolator/issues/new/choose">report any bugs you encounter</a>. Want to <a href="https://github.com/kleinfreund/balatrolator">contribute</a>?',
	version: 'Current version:',
	versionShort: 'Ver.',
	langZhShort: '中',
	langEnShort: 'EN',
	credit: 'Made with love by <a href="https://kleinfreund.de">kleinfreund</a>.',
	impostor: 'This website is <b>not</b> the real Balatrolator Balatro calculator. Go to <a href="https://balatrolator.com/">balatrolator.com</a>.',
	saves: 'Saves',
	copyState: 'Copy',
	copyStateSuccess: 'Copied to clipboard.',
	describeTitle: 'Balatrolator — current run',
	describeSectionRound: 'Round',
	describeSectionObservatory: 'Observatory',
	describeSectionLevels: 'Levels',
	describeSectionJokers: 'Jokers',
	describeSectionCards: 'Hand',
	describeSectionScore: 'Score',
	describeNoJokers: 'No jokers.',
	describeNoCards: 'No cards.',
	describeCardPlayed: 'played',
	describeCardHeld: 'held',
	describeInactive: 'inactive',
	describeBlindInactive: 'inactive',
	describeDebuffed: 'debuffed',
	copyStateFailed: 'Copy failed.',
	savesHelp: 'The current hand is auto-saved whenever the score updates. Saves are stored in the browser\'s local storage.',
	name: 'Name',
	hand: 'Hand',
	cards: 'Hand',
	score: 'Score',
	time: 'Time',
	actions: 'Actions',
	saveName: 'Save name',
	saveNamePlaceholder: 'Hand 1',
	save: 'Save',
	importSave: 'Import save',
	importHelp: 'Import any saves you previously exported in JSON format.',
	import: 'Import',
	load: 'Load',
	export: 'Export',
	deleteSave: 'Delete save',
	currentHand: 'Current hand',
	autosave: 'autosave',
	levels: 'Levels',
	levelShort: 'lvl',
	level: 'Level',
	playsShort: '#',
	numberOfPlays: 'Number of plays',
	roundData: 'Round data',
	roundShort: 'Round',
	hands: 'Hands',
	discards: 'Discards',
	money: 'Money',
	blind: 'Blind',
	deck: 'Deck',
	jokerSlots: 'Joker slots',
	observatory: 'Observatory',
	activeShort: 'Active?',
	blindActive: 'Blind active',
	influencesDebuffed: 'Influences: Debuffed cards, scoring',
	influencesPlasma: 'Influences: Scoring with Plasma Deck',
	showBlindOptions: 'Show blind options',
	filterBlinds: 'Filter blinds',
	blinds: 'Blinds',
	showDeckOptions: 'Show deck options',
	filterDecks: 'Filter decks',
	decks: 'Decks',
	showJokerOptions: 'Show joker options',
	filterJokers: 'Filter jokers',
	jokers: 'Jokers',
	noMatches: 'No matches',
	addJoker: 'Add joker',
	addCard: 'Add card',
	resetHand: 'Reset current hand',
	resetAll: 'Clear game data',
	resetAllShort: 'Clear',
	playedHand: 'Hand: ',
	log: 'Log',
	expandLog: 'Expand log',
	logPhaseBase: 'base',
	logPhasePlayedCards: 'played-cards',
	logPhaseHeldCards: 'held-cards',
	logPhaseJokers: 'jokers',
	logPhaseConsumables: 'consumables',
	logPhaseBalancing: 'balancing',
	logChips: 'chips',
	logMult: 'mult',
	logFrom: 'from',
	logFor: 'for',
	logTrigger: 'trigger',
	logTypeJoin: '\'s ',
	logTypeRank: 'rank',
	logTypeEnhancement: 'enhancement',
	logTypeEdition: 'edition',
	luckLabel: 'Luck: ',
	luckNone: 'none',
	luckAverage: 'average',
	luckAll: 'all',
	close: 'Close',
	duplicateJokerQuestion: 'Duplicate joker?',
	duplicateCardQuestion: 'Duplicate card?',
	numberOfCopies: 'Number of copies',
	duplicateHint: 'The new cards will be added to the right of the one you\'re duplicating.',
	duplicateLongPressHint: 'Long-press to choose how many copies',
	ok: 'Ok',
	moveJokerLeft: 'Move joker left',
	moveJokerRight: 'Move joker right',
	removeJoker: 'Remove joker',
	jokerName: 'Joker name',
	count: 'Count',
	duplicateJoker: 'Duplicate joker',
	edition: 'Edition',
	plusChips: '+Chips',
	plusMult: '+Mult',
	timesMult: 'xMult',
	active: 'Active?',
	rank: 'Rank',
	of: 'of',
	suit: 'Suit',
	moveCardLeft: 'Move card left',
	play: 'Play?',
	removeCard: 'Remove playing card',
	moveCardRight: 'Move card right',
	duplicateCard: 'Duplicate card',
	debuffed: 'Debuffed?',
	enhancement: 'Enhancement',
	seal: 'Seal',
}

const zh: typeof en = {
	title: 'Balatrolator – 小丑牌计分器',
	description: '在出牌前比较不同手牌组合，算出小丑牌里怎么打分更高。',
	language: '语言',
	intro: 'Balatrolator 是<a href="https://www.playbalatro.com/">小丑牌</a>的计分计算器。去买游戏吧！',
	contribute: '遇到问题请<a href="https://github.com/kleinfreund/balatrolator/issues/new/choose">反馈</a>。想<a href="https://github.com/kleinfreund/balatrolator">参与贡献</a>？',
	version: '当前版本：',
	versionShort: '版本',
	langZhShort: '中',
	langEnShort: 'EN',
	credit: '由 <a href="https://kleinfreund.de">kleinfreund</a> 用爱制作。',
	impostor: '这个网站<b>不是</b>真正的 Balatrolator 小丑牌计分器。请前往 <a href="https://balatrolator.com/">balatrolator.com</a>。',
	saves: '存档',
	copyState: '复制',
	copyStateSuccess: '已复制到剪贴板。',
	describeTitle: 'Balatrolator — 当前对局',
	describeSectionRound: '回合',
	describeSectionObservatory: '天文台',
	describeSectionLevels: '等级',
	describeSectionJokers: '小丑',
	describeSectionCards: '手牌',
	describeSectionScore: '计分',
	describeNoJokers: '无小丑。',
	describeNoCards: '无手牌。',
	describeCardPlayed: '打出',
	describeCardHeld: '未打出',
	describeInactive: '未激活',
	describeBlindInactive: '未激活',
	describeDebuffed: '被削弱',
	copyStateFailed: '复制失败。',
	savesHelp: '分数更新时会自动保存当前手牌。存档保存在浏览器的本地存储中。',
	name: '名称',
	hand: '牌型',
	cards: '手牌',
	score: '分数',
	time: '时间',
	actions: '操作',
	saveName: '存档名称',
	saveNamePlaceholder: '手牌 1',
	save: '保存',
	importSave: '导入存档',
	importHelp: '导入之前导出的 JSON 存档。',
	import: '导入',
	load: '读取',
	export: '导出',
	deleteSave: '删除存档',
	currentHand: '当前手牌',
	autosave: '自动存档',
	levels: '等级',
	levelShort: '等级',
	level: '等级',
	playsShort: '次数',
	numberOfPlays: '打出次数',
	roundData: '回合数据',
	roundShort: '回合',
	hands: '出牌',
	discards: '弃牌',
	money: '资金',
	blind: '盲注',
	deck: '牌组',
	jokerSlots: '小丑牌槽位',
	observatory: '天文台',
	activeShort: '激活？',
	blindActive: '盲注已激活',
	influencesDebuffed: '影响：被削弱的牌、计分',
	influencesPlasma: '影响：等离子牌组的计分',
	showBlindOptions: '显示盲注选项',
	filterBlinds: '筛选盲注',
	blinds: '盲注',
	showDeckOptions: '显示牌组选项',
	filterDecks: '筛选牌组',
	decks: '牌组',
	showJokerOptions: '显示小丑选项',
	filterJokers: '筛选小丑',
	jokers: '小丑',
	noMatches: '没有匹配项',
	addJoker: '添加小丑',
	addCard: '添加卡牌',
	resetHand: '重置当前手牌',
	resetAll: '清空对局数据',
	resetAllShort: '清空',
	playedHand: '牌型：',
	log: '记录',
	expandLog: '展开记录',
	logPhaseBase: '基础',
	logPhasePlayedCards: '打出',
	logPhaseHeldCards: '手牌',
	logPhaseJokers: '小丑',
	logPhaseConsumables: '消耗品',
	logPhaseBalancing: '平衡',
	logChips: '筹码',
	logMult: '倍率',
	logFrom: '来自',
	logFor: '作用于',
	logTrigger: '触发',
	logTypeJoin: '·',
	logTypeRank: '点数',
	logTypeEnhancement: '增强',
	logTypeEdition: '版本',
	luckLabel: '运气：',
	luckNone: '全不中',
	luckAverage: '平均',
	luckAll: '全中',
	close: '关闭',
	duplicateJokerQuestion: '复制小丑？',
	duplicateCardQuestion: '复制卡牌？',
	numberOfCopies: '复制数量',
	duplicateHint: '新卡牌会添加在所复制卡牌的右侧。',
	duplicateLongPressHint: '长按可选择复制数量',
	ok: '确定',
	moveJokerLeft: '左移小丑',
	moveJokerRight: '右移小丑',
	removeJoker: '移除小丑',
	jokerName: '小丑名称',
	count: '数量',
	duplicateJoker: '复制小丑',
	edition: '版本',
	plusChips: '+筹码',
	plusMult: '+倍率',
	timesMult: '×倍率',
	active: '激活？',
	rank: '点数',
	of: '·',
	suit: '花色',
	moveCardLeft: '左移卡牌',
	play: '打出？',
	removeCard: '移除卡牌',
	moveCardRight: '右移卡牌',
	duplicateCard: '复制卡牌',
	debuffed: '被削弱？',
	enhancement: '增强',
	seal: '蜡封',
}

const messages: Record<Lang, typeof en> = { en, zh }

export type UiKey = keyof typeof en

function readStoredLang (): Lang {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'
	} catch {
		return 'zh'
	}
}

let lang: Lang = readStoredLang()

export function getLang (): Lang {
	return lang
}

export function t (key: UiKey): string {
	return messages[lang][key]
}

export function term (name: string): string {
	if (lang === 'en') {
		return name
	}

	return zhTerms[name] ?? name
}

export function termEdition (name: string): string {
	if (lang === 'en') {
		return name
	}

	return zhEditions[name] ?? name
}

export function termEnhancement (name: string): string {
	if (lang === 'en') {
		return name
	}

	return zhEnhancements[name] ?? name
}

export function termSeal (name: string): string {
	if (lang === 'en') {
		return name
	}

	return zhSeals[name] ?? name
}

export function termSealColor (name: string): string {
	if (lang === 'en') {
		return termSeal(name)
	}

	return zhSealColors[name] ?? termSeal(name)
}

function setLang (next: Lang) {
	if (next === lang) {
		return
	}

	lang = next
	try {
		localStorage.setItem(STORAGE_KEY, next)
	} catch {
		// Ignore storage failures and keep the in-memory language.
	}

	applyDocumentLanguage()
	window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT))
}

function translateTree (root: ParentNode) {
	for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
		const key = el.dataset.i18n as UiKey
		el.textContent = t(key)
	}

	for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
		const key = el.dataset.i18nHtml as UiKey
		el.innerHTML = t(key)
	}

	for (const el of root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]')) {
		const key = el.dataset.i18nPlaceholder as UiKey
		el.placeholder = t(key)
	}

	for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
		const key = el.dataset.i18nAria as UiKey
		el.setAttribute('aria-label', t(key))
	}

	for (const [dataAttr, target] of [
		['data-i18n-button-label', 'button-label'],
		['data-i18n-input-label', 'input-label'],
		['data-i18n-listbox-label', 'listbox-label'],
	] as const) {
		for (const el of root.querySelectorAll<HTMLElement>(`[${dataAttr}]`)) {
			const key = el.getAttribute(dataAttr) as UiKey
			el.setAttribute(target, t(key))
		}
	}

	for (const el of root.querySelectorAll<HTMLElement>('[data-influences]')) {
		const names = (el.dataset.influences ?? '').split(',').map((name) => name.trim())
		el.textContent = lang === 'zh'
			? `影响：${names.map((name) => term(name)).join('、')}`
			: `Influences: ${names.join(', ')}`
	}

	for (const el of root.querySelectorAll<HTMLElement>('[data-term]')) {
		el.textContent = term(el.dataset.term ?? '')
	}

	for (const el of root.querySelectorAll<HTMLElement>('[data-term-paren]')) {
		const hand = term(el.dataset.termParen ?? '')
		el.textContent = lang === 'zh' ? `（${hand}）` : ` (${hand})`
	}
}

function applyDocumentLanguage () {
	document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
	document.title = t('title')
	document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'))
	translateTree(document)
	for (const template of document.querySelectorAll('template')) {
		translateTree(template.content)
	}

	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-set-lang]')) {
		button.setAttribute('aria-pressed', String(button.dataset.setLang === lang))
	}
}

function bindLanguageSwitch () {
	for (const button of document.querySelectorAll<HTMLButtonElement>('[data-set-lang]')) {
		button.addEventListener('click', () => {
			const next = button.dataset.setLang
			if (next === 'en' || next === 'zh') {
				setLang(next)
			}
		})
	}
}

applyDocumentLanguage()
bindLanguageSwitch()
