/// <reference types="vitest" />

import { execSync } from 'node:child_process'
import process from 'node:process'
import { defineConfig } from 'vitest/config'

function getCommitHash () {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
	} catch {
		return process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown'
	}
}

const commitHash = getCommitHash()

export default defineConfig({
	plugins: [
		{
			name: 'commit-hash',
			transformIndexHtml: (html) => html.replaceAll('%COMMIT_HASH%', commitHash),
		},
	],
	// Relative base so the build works both at a domain root and at a
	// GitHub Pages project subpath (https://<user>.github.io/<repo>/).
	base: './',
	test: {
		environment: 'jsdom',
		coverage: {
			include: ['src'],
		},
		include: ['src/**/*.test.ts'],
	},
})

