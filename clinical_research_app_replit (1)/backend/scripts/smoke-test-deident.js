// Smoke tests for the de-ident endpoints. Exercises everything that
// doesn't require a live MongoDB connection.
//
// Run:  node scripts/smoke-test-deident.js

process.env.DEIDENT_ENCRYPTION_KEY =
  process.env.DEIDENT_ENCRYPTION_KEY ||
  require('crypto').randomBytes(32).toString('base64');

const assert = require('assert');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    pass += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}\n        ${err.message}`);
    fail += 1;
  }
}

console.log('\n[1] Encryption roundtrip');
const { encrypt, decrypt, isEncrypted } = require(path.join(BASE, 'utils/encryption'));
test('encrypt+decrypt roundtrip preserves plaintext', () => {
  const plain = 'Bearer abc123-secret-token-do-not-leak';
  const enc = encrypt(plain);
  assert.notStrictEqual(enc, plain, 'ciphertext should differ from plaintext');
  assert.strictEqual(decrypt(enc), plain);
});
test('two encryptions of same plaintext differ (random IV)', () => {
  const a = encrypt('same input');
  const b = encrypt('same input');
  assert.notStrictEqual(a, b);
  assert.strictEqual(decrypt(a), decrypt(b));
});
test('isEncrypted recognizes ciphertext shape', () => {
  assert.strictEqual(isEncrypted(encrypt('hello world')), true);
  assert.strictEqual(isEncrypted('hello'), false);
});
test('decrypt with tampered ciphertext throws', () => {
  const enc = encrypt('legit');
  const buf = Buffer.from(enc, 'base64');
  buf[buf.length - 1] ^= 0xff;
  const tampered = buf.toString('base64');
  assert.throws(() => decrypt(tampered));
});
test('encrypt of empty/null is passthrough', () => {
  assert.strictEqual(encrypt(''), '');
  assert.strictEqual(encrypt(null), null);
});

console.log('\n[2] PhiPolicy schema (in-memory, no save)');
const PhiPolicy = require(path.join(BASE, 'models/phiPolicyModel'));
test('LOCKED + OPTIONAL static lists exposed', () => {
  assert.ok(Array.isArray(PhiPolicy.LOCKED_CATEGORIES));
  assert.ok(PhiPolicy.LOCKED_CATEGORIES.includes('PATIENT_NAME'));
  assert.ok(PhiPolicy.LOCKED_CATEGORIES.includes('DOB'));
  assert.ok(PhiPolicy.LOCKED_CATEGORIES.includes('SSN'));
  assert.ok(PhiPolicy.OPTIONAL_CATEGORIES.length >= 10);
});
test('is_safe_harbor true when every optional category redacted', () => {
  const redact = Object.fromEntries(PhiPolicy.OPTIONAL_CATEGORIES.map(c => [c, true]));
  const p = new PhiPolicy({ name: 'sh-test', preset: 'safe_harbor', redact });
  assert.strictEqual(p.is_safe_harbor, true);
});
test('is_safe_harbor false when any optional category preserved', () => {
  const redact = Object.fromEntries(PhiPolicy.OPTIONAL_CATEGORIES.map(c => [c, true]));
  redact.MRN = false;
  const p = new PhiPolicy({ name: 'ir-test', preset: 'internal_research', redact });
  assert.strictEqual(p.is_safe_harbor, false);
});
test('default redact map covers every optional category', () => {
  const p = new PhiPolicy({ name: 'default-test' });
  for (const cat of PhiPolicy.OPTIONAL_CATEGORIES) {
    assert.strictEqual(p.redact.get(cat), true,
      `default redact for ${cat} should be true`);
  }
});

console.log('\n[3] AigentsConfig pre-save encryption hook');
const AigentsConfig = require(path.join(BASE, 'models/aigentsConfigModel'));
test('toSafeJSON strips auth_token', () => {
  const c = new AigentsConfig({
    name: 'test', webhook_url: 'https://example.com',
    auth_type: 'bearer', auth_token: 'plaintext-secret'
  });
  const safe = c.toSafeJSON();
  assert.strictEqual(safe.auth_token, undefined);
  assert.strictEqual(safe.name, 'test');
});
test('decryptedToken returns null when no token set', () => {
  const c = new AigentsConfig({ name: 'no-token', webhook_url: 'https://example.com' });
  assert.strictEqual(c.decryptedToken(), null);
});
// Pre-save hook can't be tested without Mongo connection, but we can
// verify the hook is registered on the schema.
test('pre-save hook is wired on schema', () => {
  const hooks = AigentsConfig.schema.s.hooks;
  const preSave = hooks._pres.get('save') || [];
  assert.ok(preSave.length > 0, 'expected at least one pre-save hook');
});

console.log('\n[4] Synthetic chart generator');
const { generateSyntheticChart } = require(path.join(BASE, 'controllers/deidentController'));
function fakeRes() {
  const r = { _status: 200, _body: null };
  r.status = (code) => { r._status = code; return r; };
  r.json = (body) => { r._body = body; return r; };
  return r;
}
test('generates chart with default 5 pages', () => {
  const res = fakeRes();
  generateSyntheticChart({ query: {} }, res);
  assert.strictEqual(res._status, 200);
  assert.strictEqual(res._body.success, true);
  assert.strictEqual(res._body.meta.pages_requested, 5);
  assert.ok(res._body.data.includes('SYNTHETIC CLINICAL DOCUMENT'));
  assert.ok(res._body.data.length > 1000);
});
test('respects pages query param', () => {
  const res = fakeRes();
  generateSyntheticChart({ query: { pages: '20', seed: '42' } }, res);
  assert.strictEqual(res._body.meta.pages_requested, 20);
  assert.strictEqual(res._body.meta.seed, 42);
  assert.ok(res._body.meta.visits >= 8);
});
test('clamps pages to safe ceiling (200)', () => {
  const res = fakeRes();
  generateSyntheticChart({ query: { pages: '99999' } }, res);
  assert.strictEqual(res._body.meta.pages_requested, 200);
});
test('generated text contains identifiable PHI categories for the demo', () => {
  const res = fakeRes();
  generateSyntheticChart({ query: { pages: '10', seed: '7' } }, res);
  const txt = res._body.data;
  assert.ok(/MRN: \d{8}/.test(txt), 'expected MRN pattern');
  assert.ok(/DOB: \d{2}\/\d{2}\/19\d{2}/.test(txt), 'expected DOB pattern');
  assert.ok(/Dr\. \w+/.test(txt), 'expected provider name');
  assert.ok(/\(\d{3}\) \d{3}-\d{4}/.test(txt), 'expected phone pattern');
  assert.ok(/@example\.com/.test(txt), 'expected synthetic email');
});
test('seeded generation is deterministic', () => {
  const a = fakeRes(); generateSyntheticChart({ query: { pages: '5', seed: '99' } }, a);
  const b = fakeRes(); generateSyntheticChart({ query: { pages: '5', seed: '99' } }, b);
  assert.strictEqual(a._body.data, b._body.data);
});

console.log('\n[5] Routes load and mount cleanly');
test('deident routes module loads without throwing', () => {
  const router = require(path.join(BASE, 'routes/deidentRoutes'));
  assert.ok(router);
  const paths = router.stack.map(layer => layer.route?.path).filter(Boolean);
  assert.ok(paths.includes('/audit'));
  assert.ok(paths.includes('/forward'));
  assert.ok(paths.includes('/policies'));
  assert.ok(paths.includes('/chain-runs'));
  assert.ok(paths.includes('/fixtures/synthetic-chart'));
});

console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail === 0 ? 0 : 1);
