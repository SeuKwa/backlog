import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const base = process.env.BASE_PATH ?? '';
const outDir = process.env.OUT_DIR ?? 'build';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    paths: { base },
    adapter: adapter({
      pages: outDir,
      assets: outDir,
      fallback: '200.html',
      precompress: false,
      strict: true
    })
  }
};

export default config;
