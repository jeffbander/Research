// Integration test: spins up the deident router on a minimal Express
// app (no Mongo bootstrap) and hits it over HTTP to verify auth gates
// and public route behavior.
//
// Run:  node scripts/integration-test-deident.js

process.env.DEIDENT_ENCRYPTION_KEY =
  process.env.DEIDENT_ENCRYPTION_KEY ||
  require('crypto').randomBytes(32).toString('base64');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';

const express = require('express');
const http = require('http');
const path = require('path');

const deidentRoutes = require(path.join(__dirname, '..', 'routes', 'deidentRoutes'));

const app = express();
app.use(express.json());
app.use('/api/deident', deidentRoutes);

let pass = 0;
let fail = 0;
function record(name, ok, detail) {
  if (ok) { console.log(`  PASS  ${name}`); pass += 1; }
  else    { console.log(`  FAIL  ${name}\n        ${detail || ''}`); fail += 1; }
}

function request(server, opts) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, method: opts.method || 'GET',
      path: opts.path, headers: opts.headers || {}
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = body; }
        resolve({ status: res.statusCode, body: parsed, raw: body });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

(async () => {
  const server = app.listen(0); // bind to ephemeral port
  await new Promise((r) => server.on('listening', r));
  console.log(`\nServer listening on port ${server.address().port}\n`);

  console.log('[A] Public synthetic-chart endpoint');
  {
    const r = await request(server, { path: '/api/deident/fixtures/synthetic-chart' });
    record('default GET returns 200', r.status === 200, `got ${r.status}`);
    record('payload has data + meta', r.body?.success === true && typeof r.body?.data === 'string',
      `body keys: ${Object.keys(r.body || {}).join(',')}`);
    record('chart contains synthetic patient identifiers',
      /MRN: \d{8}/.test(r.body.data) && /DOB: \d{2}\/\d{2}\//.test(r.body.data),
      'missing expected patterns');
  }
  {
    const r = await request(server, { path: '/api/deident/fixtures/synthetic-chart?pages=15&seed=123' });
    record('pages=15 honored', r.body?.meta?.pages_requested === 15);
    record('seed reflected in meta', r.body?.meta?.seed === 123);
    record('chart length scales with pages', r.body.data.length > 5000,
      `len=${r.body.data.length}`);
  }

  console.log('\n[B] Protected routes return 401 without auth');
  for (const path of [
    '/api/deident/audit',
    '/api/deident/aigents-configs',
    '/api/deident/policies',
    '/api/deident/chain-runs'
  ]) {
    const r = await request(server, { path });
    record(`GET ${path} → 401`, r.status === 401, `got ${r.status}`);
  }
  {
    const r = await request(server, {
      method: 'POST', path: '/api/deident/forward',
      headers: { 'content-type': 'application/json' },
      body: { config_id: 'x', payload: {} }
    });
    record('POST /forward → 401', r.status === 401, `got ${r.status}`);
  }

  console.log('\n[C] Protected routes return 401 with bogus token');
  {
    const r = await request(server, {
      path: '/api/deident/audit',
      headers: { Authorization: 'Bearer not-a-real-token' }
    });
    record('GET /audit with garbage token → 401', r.status === 401, `got ${r.status}`);
  }

  console.log('\n[D] Auth gate ordering — admin-only routes reject non-admin');
  // Forge a JWT for a non-admin user. The protect middleware will fail
  // when it tries User.findById because Mongo is offline, returning 401.
  // That still proves protect runs before authorize.
  const jwt = require('jsonwebtoken');
  const userToken = jwt.sign({ id: '000000000000000000000000' }, process.env.JWT_SECRET);
  {
    const r = await request(server, {
      method: 'POST', path: '/api/deident/aigents-configs',
      headers: { Authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
      body: { name: 'x', webhook_url: 'https://e.com' }
    });
    record('POST /aigents-configs with valid JWT but no DB → 401 (User lookup fails)',
      r.status === 401, `got ${r.status}`);
  }

  server.close();
  console.log(`\n--- ${pass} passed, ${fail} failed ---`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
