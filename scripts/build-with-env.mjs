import { spawnSync } from 'node:child_process';

const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) {
  console.error('usage: node scripts/build-with-env.mjs <BASE_PATH> <OUT_DIR>');
  process.exit(1);
}
const res = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: base, OUT_DIR: outDir }
});
process.exit(res.status ?? 1);
