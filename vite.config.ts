import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		setupFiles: ['src/vitest-setup.ts'],
        alias: {
            '$env/dynamic/private': path.resolve(__dirname, 'src/lib/test/env-mock.ts')
        }
	}
});
