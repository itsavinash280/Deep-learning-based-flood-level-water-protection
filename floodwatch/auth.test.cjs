const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient, controller } = require('./dist/auth-client.js');
const config = require('./dist/auth-config.json');
const tick = () => new Promise(resolve => setImmediate(resolve));

function provider(overrides = {}) {
  let callback;
  const users = [], errors = [];
  const auth = {
    getSession: async () => ({ data: { session: { access_token: 'test-only' } }, error: null }),
    getUser: async () => ({ data: { user: { id: 'verified-user', email: 'test@example.invalid' } }, error: null }),
    onAuthStateChange: handler => { callback = handler; return { data: { subscription: { unsubscribe() {} } } }; },
    ...overrides,
  };
  const control = controller(auth, { onUser: user => users.push(user), onRecovery() {}, onError: error => errors.push(error) });
  return { control, users, errors, emit: (event, session) => callback(event, session) };
}
test('browser client accepts only HTTPS Supabase URLs and publishable keys', () => {
  const sdk = { createClient: (url, key, options) => ({ url, key, options }) };
  const client = createClient(sdk, config);
  assert.equal(client.options.auth.persistSession, true);
  assert.equal(client.options.auth.autoRefreshToken, true);
  for (const key of ['sb_secret_do-not-expose', 'service_role', '', undefined]) assert.throws(() => createClient(sdk, { ...config, publishableKey: key }));
  assert.throws(() => createClient(sdk, { ...config, url: 'http://example.com' }));
});
test('restored session opens dashboard only after server confirms user', async () => {
  const p = provider(); await p.control.restore();
  assert.equal(p.users.at(-1).id, 'verified-user');
  assert.equal(p.errors.length, 0);
});
test('forged or expired persisted session never opens dashboard', async () => {
  const p = provider({ getUser: async () => ({ data: { user: null }, error: new Error('Invalid JWT') }) });
  await p.control.restore(); assert.deepEqual(p.users, [null]); assert.equal(p.errors.length, 1);
});
test('logout wins over an in-flight session verification', async () => {
  let resolveUser;
  const p = provider({ getUser: () => new Promise(resolve => { resolveUser = resolve; }) });
  const restored = p.control.restore(); await tick();
  p.emit('SIGNED_OUT', null);
  resolveUser({ data: { user: { id: 'old-user' } }, error: null }); await restored;
  assert.deepEqual(p.users, [null]);
});
test('logged-out or unconfirmed signup session stays on login', async () => {
  const p = provider({ getSession: async () => ({ data: { session: null }, error: null }) });
  await p.control.restore(); assert.deepEqual(p.users, [null]);
});
test('provider sign-in and cross-tab sign-out update current session', async () => {
  const p = provider(); p.emit('SIGNED_IN', { access_token: 'test-only' }); await tick();
  assert.equal(p.users.at(-1).id, 'verified-user');
  p.emit('SIGNED_OUT', null); assert.equal(p.users.at(-1), null);
});
