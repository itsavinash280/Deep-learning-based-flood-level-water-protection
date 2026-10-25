const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function page() {
  const elements = new Map();
  let focused;
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id, value: '', hidden: false, disabled: false, dataset: {}, attributes: {}, listeners: {},
        classList: {
          contains: name => classes.has(name),
          add: name => classes.add(name), remove: name => classes.delete(name),
          toggle(name, force) { const next = force ?? !classes.has(name); next ? classes.add(name) : classes.delete(name); return next; },
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        setCustomValidity(value) { this.validationMessage = value; },
        focus() { focused = id; }, reset() {},
      });
    }
    return elements.get(id);
  }
  const document = {
    body: element('body'), getElementById: element,
    querySelectorAll: () => [], listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
  };
  return { document, element, focused: () => focused };
}
function source(file) { return fs.readFileSync(path.join(__dirname, 'dist', file), 'utf8'); }

test('closed mobile navigation is inert; open, close and Escape restore focus', () => {
  const p = page();
  const media = { matches: true, addEventListener() {} };
  vm.runInNewContext(source('app.js'), {
    document: p.document, window: { matchMedia: () => media, addEventListener() {} },
    location: { hash: '' }, requestAnimationFrame() {},
  });
  assert.equal(p.element('sidebar').inert, true);
  p.element('menu-toggle').listeners.click();
  assert.equal(p.element('sidebar').inert, false);
  assert.equal(p.element('nav-backdrop').hidden, false);
  assert.equal(p.focused(), 'close-nav');
  p.document.listeners.keydown({ key: 'Escape' });
  assert.equal(p.element('sidebar').inert, true);
  assert.equal(p.element('nav-backdrop').hidden, true);
  assert.equal(p.element('menu-toggle').attributes['aria-expanded'], 'false');
  assert.equal(p.focused(), 'menu-toggle');
});

test('mismatched signup passwords stay local, expose an inline error, and clear on edit', async () => {
  const p = page();
  const tabs = ['signin', 'signup'].map(mode => { const e = p.element(mode); e.dataset.authMode = mode; return e; });
  p.document.querySelectorAll = selector => selector.includes('data-auth-mode') ? tabs : [];
  let signupCalls = 0;
  const sdk = { createClient: () => ({ auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => { signupCalls++; return { data: { session: null }, error: null }; },
  } }) };
  await vm.runInNewContext(source('auth-ui.js'), {
    document: p.document, window: { FloodSupabase: sdk }, FloodSupabase: sdk,
    FloodAuth: require('./dist/auth-client.js'),
    fetch: async () => ({ ok: true, json: async () => require('./dist/auth-config.json') }),
    location: { hash: '', href: 'http://127.0.0.1:4173/' }, URL, URLSearchParams,
  });
  tabs[1].listeners.click();
  p.element('auth-email').value = 'test@example.invalid';
  p.element('auth-password').value = 'first-password';
  p.element('auth-confirm').value = 'different-password';
  await p.element('auth-form').listeners.submit({ preventDefault() {} });
  assert.equal(signupCalls, 0);
  assert.equal(p.element('auth-confirm').attributes['aria-invalid'], 'true');
  assert.equal(p.element('auth-confirm-error').hidden, false);
  assert.equal(p.focused(), 'auth-confirm');
  p.element('auth-confirm').listeners.input();
  assert.equal(p.element('auth-confirm').validationMessage, '');
  assert.equal(p.element('auth-confirm-error').hidden, true);
});
