/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
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
