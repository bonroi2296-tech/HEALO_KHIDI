/**
 * Smoke Test: Inquiry Flow (ESM)
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test-inquiry.js
 *   (or) npm run test:smoke:inquiry
 *
 * Prereq: npm run dev running
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = 10_000;

async function request(path) {
  const url = new URL(path, BASE_URL).toString();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    return { status: res.status };
  } finally {
    clearTimeout(t);
  }
}

const tests = [
  ['/inquiry', 200],
  ['/inquiry/intake', 200],
  ['/success', 200],
];

(async () => {
  // server check
  try {
    await request('/');
  } catch (err) {
    console.error(`❌ Cannot connect: ${BASE_URL}`);
    console.error('   Start server first: npm run dev');
    console.error('   Error:', err.message);
    process.exit(1);
  }

  console.log(`🧪 Smoke Test (base: ${BASE_URL})\n`);

  let failed = 0;
  for (const [path, expected] of tests) {
    try {
      const { status } = await request(path);
      if (status === expected) {
        console.log(`✅ ${path} (${status})`);
      } else {
        failed++;
        console.log(`❌ ${path} expected ${expected}, got ${status}`);
      }
    } catch (e) {
      failed++;
      console.log(`❌ ${path} error: ${e.name || ''} ${e.message || e}`);
    }
  }

  console.log(`\nResult: ${failed === 0 ? 'PASS' : `FAIL (${failed})`}`);
  process.exit(failed === 0 ? 0 : 1);
})();
