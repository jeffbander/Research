// End-to-end test against a real (in-memory) MongoDB. Verifies the
// pieces the unit + HTTP-level tests can't reach: pre-save encryption,
// query indexes, and the audit -> forward -> chain-run-linkback flow.
//
// Run:  node scripts/e2e-test-deident.js

process.env.DEIDENT_ENCRYPTION_KEY =
  process.env.DEIDENT_ENCRYPTION_KEY ||
  require('crypto').randomBytes(32).toString('base64');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';

const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BASE = path.resolve(__dirname, '..');
const User = require(path.join(BASE, 'models/userModel'));
const AigentsConfig = require(path.join(BASE, 'models/aigentsConfigModel'));
const PhiPolicy = require(path.join(BASE, 'models/phiPolicyModel'));
const DeidentAudit = require(path.join(BASE, 'models/deidentAuditModel'));
const deidentRoutes = require(path.join(BASE, 'routes/deidentRoutes'));

let pass = 0, fail = 0;
function record(name, ok, detail) {
  if (ok) { console.log(`  PASS  ${name}`); pass += 1; }
  else    { console.log(`  FAIL  ${name}\n        ${detail || ''}`); fail += 1; }
}
async function expect(name, ok, detail) { record(name, ok, detail); }

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
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

(async () => {
  console.log('\nBooting in-memory MongoDB...');
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  console.log(`Connected: ${mongo.getUri()}\n`);

  // Mock Aigents endpoint that records what it receives + returns a chain_run_id
  let lastAigentsRequest = null;
  const aigentsMock = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      lastAigentsRequest = {
        path: req.url,
        headers: req.headers,
        body: JSON.parse(body)
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ chain_run_id: 'cr_e2e_12345', status: 'queued' }));
    });
  }).listen(0);
  await new Promise((r) => aigentsMock.on('listening', r));
  const aigentsUrl = `http://127.0.0.1:${aigentsMock.address().port}/webhook`;

  const app = express();
  app.use(express.json());
  app.use('/api/deident', deidentRoutes);
  const server = app.listen(0);
  await new Promise((r) => server.on('listening', r));

  // Seed an admin user + a coordinator user
  const admin = await User.create({
    firstName: 'Admin', lastName: 'User', email: 'admin@example.com',
    password: 'pw_for_test_only_x', role: 'admin'
  });
  const coordinator = await User.create({
    firstName: 'Coord', lastName: 'User', email: 'coord@example.com',
    password: 'pw_for_test_only_x', role: 'research_coordinator'
  });
  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  const coordToken = jwt.sign({ id: coordinator._id }, process.env.JWT_SECRET);
  const adminAuth = { Authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' };
  const coordAuth = { Authorization: `Bearer ${coordToken}`, 'content-type': 'application/json' };

  console.log('[1] AigentsConfig encryption-at-rest (real Mongo round-trip)');
  let configId;
  {
    const created = await AigentsConfig.create({
      name: 'test-aigents',
      webhook_url: aigentsUrl,
      auth_type: 'bearer',
      auth_token: 'plaintext-token-do-not-leak',
      default_chain_title: 'echo_chain'
    });
    configId = created._id;

    // Read back the raw doc through the Mongo driver, bypassing Mongoose,
    // so we see what's actually stored.
    const raw = await mongoose.connection.db
      .collection('aigentsconfigs')
      .findOne({ _id: configId });
    record('stored auth_token is NOT the plaintext',
      raw.auth_token !== 'plaintext-token-do-not-leak',
      `stored: ${raw.auth_token}`);
    record('stored auth_token decodes as base64 longer than IV+TAG (28 bytes)',
      Buffer.from(raw.auth_token, 'base64').length > 28);

    // Load through Mongoose with select:+auth_token and decrypt.
    const loaded = await AigentsConfig.findById(configId).select('+auth_token');
    record('decryptedToken() returns original plaintext',
      loaded.decryptedToken() === 'plaintext-token-do-not-leak');

    // Default load (without +auth_token) doesn't expose the field.
    const lazyLoaded = await AigentsConfig.findById(configId);
    record('default load does not include auth_token',
      lazyLoaded.auth_token === undefined);
  }

  console.log('\n[2] PhiPolicy persistence + virtual after save');
  {
    const policy = await PhiPolicy.create({
      name: 'internal-research-test',
      preset: 'internal_research',
      redact: Object.fromEntries(
        PhiPolicy.OPTIONAL_CATEGORIES.map(c =>
          [c, !['MRN', 'PROVIDER_NAME', 'VISIT_DATE'].includes(c)])
      ),
      irb_protocol: 'IRB-2024-118'
    });
    record('policy persisted with stable id', policy._id != null);
    const reloaded = await PhiPolicy.findById(policy._id);
    record('redact map round-tripped MRN=false', reloaded.redact.get('MRN') === false);
    record('redact map round-tripped PHONE=true', reloaded.redact.get('PHONE') === true);
    record('is_safe_harbor virtual = false on internal_research', reloaded.is_safe_harbor === false);

    const sh = await PhiPolicy.create({
      name: 'safe-harbor-test',
      preset: 'safe_harbor',
      redact: Object.fromEntries(PhiPolicy.OPTIONAL_CATEGORIES.map(c => [c, true]))
    });
    const shReloaded = await PhiPolicy.findById(sh._id);
    record('is_safe_harbor virtual = true when all optional redacted',
      shReloaded.is_safe_harbor === true);
  }

  console.log('\n[3] HTTP: audit create + list (authed)');
  let auditId;
  {
    const r = await request(server, {
      method: 'POST', path: '/api/deident/audit', headers: coordAuth,
      body: {
        doc_id: 'doc_e2e_001',
        original_chars: 12000, cleansed_chars: 11800, chunk_count: 7,
        input_sha256: 'a'.repeat(64), output_sha256: 'b'.repeat(64),
        model_used: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', model_version: '0.2.83',
        elapsed_ms: 45000,
        policy: {
          preset: 'internal_research', is_safe_harbor: false,
          redacted_categories: ['PATIENT_NAME', 'DOB', 'SSN', 'PHONE'],
          preserved_categories: ['MRN', 'PROVIDER_NAME'],
          notes: 'IRB-2024-118'
        },
        redaction_categories: { PATIENT_NAME: 12, DOB: 3, PHONE: 5 }
      }
    });
    record('POST /audit returns 201', r.status === 201, `got ${r.status} ${JSON.stringify(r.body)}`);
    auditId = r.body?.data?._id;
    record('audit got an _id', auditId != null);
    record('audit linked to authed user',
      r.body?.data?.user === String(coordinator._id),
      `user=${r.body?.data?.user} expected=${coordinator._id}`);
  }
  {
    const r = await request(server, {
      path: '/api/deident/audit?preset=internal_research', headers: coordAuth
    });
    record('GET /audit?preset=internal_research returns the record',
      r.status === 200 && r.body.count === 1);
  }

  console.log('\n[4] HTTP: aigents-configs admin gating + safe responses');
  let httpConfigId;
  {
    const denied = await request(server, {
      method: 'POST', path: '/api/deident/aigents-configs', headers: coordAuth,
      body: { name: 'should-fail', webhook_url: aigentsUrl }
    });
    record('coordinator POST /aigents-configs → 403',
      denied.status === 403, `got ${denied.status}`);
  }
  {
    const ok = await request(server, {
      method: 'POST', path: '/api/deident/aigents-configs', headers: adminAuth,
      body: {
        name: 'http-created', webhook_url: aigentsUrl,
        auth_type: 'bearer', auth_token: 'http-secret-token',
        default_chain_title: 'echo_chain'
      }
    });
    record('admin POST /aigents-configs → 201', ok.status === 201, `got ${ok.status}`);
    httpConfigId = ok.body?.data?._id;
    record('response strips auth_token', ok.body?.data?.auth_token === undefined);
  }

  console.log('\n[5] HTTP: forward → mock Aigents → chain-run linkback');
  {
    const payload = {
      source_name: 'research_app_deident',
      source_id: 'doc_e2e_001',
      user_email: 'coord@example.com',
      chain_title: 'echo_chain',
      first_step_user_input: 'CLEANSED CHART TEXT — [PATIENT_NAME-1] presents...',
      starting_variables: { deident_meta: { doc_id: 'doc_e2e_001' } }
    };
    const r = await request(server, {
      method: 'POST', path: '/api/deident/forward', headers: coordAuth,
      body: { config_id: httpConfigId, payload, audit_id: auditId }
    });
    record('POST /forward → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.body)}`);
    record('response surfaces chain_run_id', r.body?.chain_run_id === 'cr_e2e_12345');

    record('mock Aigents received the cleansed payload byte-for-byte',
      lastAigentsRequest?.body?.first_step_user_input === payload.first_step_user_input);
    record('mock Aigents got Bearer header attached server-side',
      lastAigentsRequest?.headers?.authorization === 'Bearer http-secret-token');
    record('the bearer token in the upstream call is the original plaintext (decrypted on the way out)',
      lastAigentsRequest?.headers?.authorization?.endsWith('http-secret-token'));

    // Verify back-link onto the audit record
    const refreshed = await DeidentAudit.findById(auditId);
    record('audit record back-linked with chain_run_id',
      refreshed.aigents_chain_run_id === 'cr_e2e_12345');
    record('audit record back-linked with chain_title',
      refreshed.aigents_chain_title === 'echo_chain');
    record('audit record stamped with aigents_forwarded_at',
      refreshed.aigents_forwarded_at instanceof Date);
  }

  console.log('\n[6] HTTP: chain-run report includes the forwarded audit');
  {
    const r = await request(server, {
      path: '/api/deident/chain-runs', headers: coordAuth
    });
    record('GET /chain-runs → 200', r.status === 200);
    record('summary counts the run', r.body?.summary?.total === 1);
    record('summary categorizes as non-Safe-Harbor',
      r.body?.summary?.non_safe_harbor === 1 && r.body?.summary?.safe_harbor === 0);
    record('record carries chain_run_id from the forward step',
      r.body?.data?.[0]?.aigents_chain_run_id === 'cr_e2e_12345');
  }

  console.log('\n[7] HTTP: forward with bad config_id returns 404');
  {
    const r = await request(server, {
      method: 'POST', path: '/api/deident/forward', headers: coordAuth,
      body: { config_id: '000000000000000000000000', payload: { foo: 'bar' } }
    });
    record('POST /forward bad config → 404', r.status === 404, `got ${r.status}`);
  }

  // teardown
  server.close();
  aigentsMock.close();
  await mongoose.disconnect();
  await mongo.stop();

  console.log(`\n--- ${pass} passed, ${fail} failed ---`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
