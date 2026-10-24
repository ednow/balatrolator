import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const POLL_MS = 15_000
const DIRTY_WAIT_MS = 250_000
const CREATE_TIMEOUT_MS = 90_000
const TESTS_TIMEOUT_MS = 600_000
const DEPLOY_TIMEOUT_MS = 900_000
const MAX_COMMIT_AGE_MS = 20 * 60_000
const LOCK_STALE_MS = 35 * 60_000
const MAX_AUTOFIX_ATTEMPTS = 3
const projectDir = process.env.QODER_PROJECT_DIR || process.cwd()

function sh(command, args) {
	return execFileSync(command, args, {
		cwd: projectDir,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim()
}

function git(...args) {
	return sh('git', args)
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function gitDirPath() {
	return path.resolve(projectDir, git('rev-parse', '--git-dir'))
}

function statePaths(sha) {
	const gitDir = gitDirPath()
	return {
		markerDir: path.join(gitDir, 'qoder-ci-reported'),
		marker: path.join(gitDir, 'qoder-ci-reported', sha),
		lockDir: path.join(gitDir, 'qoder-ci-watching'),
		lock: path.join(gitDir, 'qoder-ci-watching', sha),
	}
}

function log(line) {
	try {
		fs.appendFileSync(path.join(gitDirPath(), 'qoder-auto-commit.log'), `[${new Date().toISOString()}] ${line}\n`)
	} catch {}
}

function failureStreakPath() {
	return path.join(gitDirPath(), 'qoder-tests-failed-streak')
}

function incrementFailureStreak() {
	try {
		const current = Number(fs.readFileSync(failureStreakPath(), 'utf8')) || 0
		const next = current + 1
		fs.writeFileSync(failureStreakPath(), String(next))
		return next
	} catch {
		return 1
	}
}

function resetFailureStreak() {
	try {
		fs.rmSync(failureStreakPath(), { force: true })
	} catch {}
}

function mark(sha, status, message) {
	try {
		const paths = statePaths(sha)
		fs.mkdirSync(paths.markerDir, { recursive: true })
		fs.writeFileSync(paths.marker, JSON.stringify({ status, at: new Date().toISOString(), ...(message ? { message } : {}) }) + '\n')
		fs.rmSync(paths.lock, { force: true })
	} catch {}
}

function exitSilently(line) {
	if (line) log(line)
	process.exit(0)
}

function wake(message, status, sha) {
	const key = sha || (() => {
		try {
			return git('rev-parse', 'HEAD')
		} catch {
			return 'unknown'
		}
	})()
	mark(key, status, message)
	log(message)
	fs.writeSync(2, message + '\n')
	process.exit(2)
}

function parseRemote(remote) {
	const match = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
	if (!match) return null
	return { owner: match[1], repo: match[2] }
}

function pageUrl(owner, repo) {
	return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
		? `https://${owner}.github.io/`
		: `https://${owner}.github.io/${repo}/`
}

async function main() {
	let remote
	try {
		remote = git('remote', 'get-url', 'origin')
	} catch {
		exitSilently('skip: no origin remote')
	}

	const target = parseRemote(remote)
	if (!target) exitSilently(`skip: not a GitHub remote (${remote})`)
	const { owner, repo } = target

	const branch = git('branch', '--show-current')
	if (branch !== 'main') exitSilently(`skip: branch ${branch} does not trigger Tests on push`)

	const isDirty = () => {
		try {
			return git('status', '--porcelain') !== ''
		} catch {
			return true
		}
	}

	const headBeforeWait = git('rev-parse', 'HEAD')
	if (isDirty()) {
		const deadline = Date.now() + DIRTY_WAIT_MS
		while (Date.now() < deadline && isDirty()) {
			await sleep(3_000)
		}
	}

	const sha = git('rev-parse', 'HEAD')
	if (isDirty() && sha === headBeforeWait) {
		const stateKey = createHash('sha1').update(`${sha}\n${git('status', '--porcelain')}`).digest('hex')
		const failDir = path.join(gitDirPath(), 'qoder-ci-commit-failed')
		const failMarker = path.join(failDir, stateKey)
		if (!fs.existsSync(failMarker)) {
			try {
				fs.mkdirSync(failDir, { recursive: true })
				fs.writeFileSync(failMarker, JSON.stringify({ at: new Date().toISOString(), head: sha }) + '\n')
			} catch {}
			wake(`工作区仍有未提交改动，自动提交可能失败；请检查 git status 与 .git/qoder-auto-commit.log。最近提交 ${sha.slice(0, 7)}。`, 'commit-failed', sha)
		}
		exitSilently(`skip: commit failure already reported for ${sha.slice(0, 7)}`)
	}

	const shortSha = sha.slice(0, 7)
	const commitAge = Date.now() - Number(git('show', '-s', '--format=%ct', 'HEAD')) * 1_000
	if (commitAge > MAX_COMMIT_AGE_MS) {
		exitSilently(`skip: HEAD ${shortSha} is older than ${MAX_COMMIT_AGE_MS / 60_000} minutes`)
	}

	const paths = statePaths(sha)
	if (fs.existsSync(paths.marker)) exitSilently(`skip: ${shortSha} already reported`)
	try {
		fs.mkdirSync(paths.lockDir, { recursive: true })
		fs.writeFileSync(paths.lock, String(process.pid), { flag: 'wx' })
	} catch {
		let ownerAlive = false
		try {
			const pid = Number(fs.readFileSync(paths.lock, 'utf8'))
			if (pid > 0) {
				try {
					process.kill(pid, 0)
					ownerAlive = true
				} catch (error) {
					ownerAlive = error?.code === 'EPERM'
				}
			}
		} catch {}
		let stale = !ownerAlive
		if (!stale) {
			try {
				stale = Date.now() - fs.statSync(paths.lock).mtimeMs >= LOCK_STALE_MS
			} catch {}
		}
		if (!stale) exitSilently(`skip: ${shortSha} is already being watched`)
		try {
			fs.rmSync(paths.lock, { force: true })
			fs.writeFileSync(paths.lock, String(process.pid), { flag: 'wx' })
		} catch {
			exitSilently(`skip: ${shortSha} is already being watched`)
		}
	}

	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'qoder-auto-commit',
	}
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

	const etagCache = new Map()
	async function gh(pathname) {
		const url = `https://api.github.com/repos/${owner}/${repo}${pathname}`
		const requestHeaders = { ...headers }
		const cached = etagCache.get(url)
		if (cached) requestHeaders['If-None-Match'] = cached.etag

		const response = await fetch(url, { headers: requestHeaders, signal: AbortSignal.timeout(20_000) })
		if (response.status === 304 && cached) return cached.data
		if (!response.ok) {
			const body = await response.text().catch(() => '')
			throw new Error(`GitHub API ${response.status} ${pathname}${body ? `: ${body.slice(0, 200)}` : ''}`)
		}

		const data = await response.json()
		const etag = response.headers.get('etag')
		if (etag) etagCache.set(url, { etag, data })
		return data
	}

	async function waitForRun(workflow, completionTimeoutMs) {
		const createDeadline = Date.now() + CREATE_TIMEOUT_MS
		let run = null
		while (!run && Date.now() < createDeadline) {
			const data = await gh(`/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=10`)
			run = (data.workflow_runs || []).find(candidate => candidate.head_sha === sha) || null
			if (!run) await sleep(POLL_MS)
		}
		if (!run) return null

		const completeDeadline = Date.now() + completionTimeoutMs
		while (run.status !== 'completed' && Date.now() < completeDeadline) {
			await sleep(POLL_MS)
			const data = await gh(`/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=10`)
			run = (data.workflow_runs || []).find(candidate => candidate.id === run.id) || run
		}
		return run
	}

	async function failedJobs(runId) {
		try {
			const data = await gh(`/actions/runs/${runId}/jobs?per_page=100`)
			return (data.jobs || [])
				.filter(job => job.conclusion === 'failure')
				.map(job => {
					const steps = (job.steps || []).filter(step => step.conclusion === 'failure').map(step => step.name).join('、')
					return steps ? `${job.name}（${steps}）` : job.name
				})
		} catch {
			return []
		}
	}

	function report(message, status) {
		const headNow = git('rev-parse', 'HEAD')
		if (headNow !== sha) {
			mark(sha, 'superseded')
			exitSilently(`skip: ${shortSha} superseded by ${headNow.slice(0, 7)}`)
		}
		wake(message, status, sha)
	}

	const tests = await waitForRun('tests.yml', TESTS_TIMEOUT_MS)
	if (!tests) {
		report(`提交 ${shortSha} 未检测到 Tests workflow 运行（push 可能失败、workflow 未启用，或提交未触发该 workflow）。`, 'tests-missing')
	}
	if (tests.status !== 'completed') {
		report(`提交 ${shortSha} 的 Tests 在 ${TESTS_TIMEOUT_MS / 60_000} 分钟内未完成（status=${tests.status}）；${tests.html_url}`, 'tests-timeout')
	}
	if (tests.conclusion === 'success') {
		resetFailureStreak()
	}
	if (tests.conclusion !== 'success') {
		const failed = await failedJobs(tests.id)
		const detail = failed.length ? failed.join('；') : `conclusion=${tests.conclusion}`
		const attempts = incrementFailureStreak()
		const fixInstructions = attempts < MAX_AUTOFIX_ATTEMPTS
			? '请立即用 Agent 工具起一个子 agent 自动修复，并严格限制范围：'
				+ '只能修改测试文件（playwright/tests/**、src/**/*.test.ts、src/lib/test-files/**），'
				+ '禁止修改 src/ 下的实现代码、配置、依赖或工作流。'
				+ '让它先本地复现并跑通相关测试；若定位为产品代码缺陷而非测试过期，停止修改并报告，不要改源码。'
				+ '修复后不要自行提交，结束回合由自动提交钩子提交并推送。'
			: `已连续 ${attempts} 次失败，停止自动修复；请人工检查测试或实现代码后再提交。`
		report(
			`提交 ${shortSha} 已推送，但 Tests 失败：${detail}；${tests.html_url}。连续第 ${attempts} 次失败。${fixInstructions}`,
			'tests-failed',
		)
	}

	const deploy = await waitForRun('deploy.yml', DEPLOY_TIMEOUT_MS)
	if (!deploy) {
		report(`提交 ${shortSha} 的 Tests 已通过，但未检测到 Deploy workflow 运行；Tests: ${tests.html_url}`, 'deploy-missing')
	}
	if (deploy.status !== 'completed') {
		report(`提交 ${shortSha} 的 Tests 已通过，Deploy 在 ${DEPLOY_TIMEOUT_MS / 60_000} 分钟内未完成（status=${deploy.status}）；${deploy.html_url}`, 'deploy-timeout')
	}
	if (deploy.conclusion !== 'success') {
		const failed = await failedJobs(deploy.id)
		const detail = failed.length ? failed.join('；') : `conclusion=${deploy.conclusion}`
		report(`提交 ${shortSha} 的 Tests 已通过，但 Deploy 失败：${detail}；${deploy.html_url}。请修复后重新提交。`, 'deploy-failed')
	}

	report(`提交 ${shortSha} 已推送；Tests ✅；Deploy ✅；${deploy.html_url}；页面 ${pageUrl(owner, repo)}。无需修改代码。`, 'success')
}

main().catch(error => {
	wake(`CI 状态查询失败：${error instanceof Error ? error.message : String(error)}`, 'error')
})
