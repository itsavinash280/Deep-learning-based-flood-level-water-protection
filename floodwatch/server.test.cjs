const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const serverFile = path.join(__dirname, 'server.cjs');

function launch(port) {
  const env = { ...process.env };
  if (port === undefined) delete env.PORT;
  else env.PORT = String(port);
  const child = spawn(process.execPath, [serverFile], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const exited = once(child, 'exit');
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Server startup timed out: ' + output)); }, 10000);
    child.stdout.on('data', () => {
      const match = output.match(/Local: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited with ' + code + ': ' + output)); });
  });
  return { child, ready, exited, output: () => output };
}

test('default dev command starts on another port when 4173 is occupied', async () => {
  const blocker = net.createServer();
  await new Promise((resolve, reject) => {
    blocker.once('error', error => error.code === 'EADDRINUSE' ? resolve() : reject(error));
    blocker.listen(4173, '127.0.0.1', resolve);
  });
  const running = launch();
  try {
    const url = await running.ready;
    assert.notEqual(new URL(url).port, '4173');
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="auth-form"/);
    assert.match(running.output(), /next available port/);
  } finally {
    running.child.kill();
    await running.exited;
    if (blocker.listening) await new Promise(resolve => blocker.close(resolve));
  }
});

test('explicit PORT starts the site and serves authentication assets', async () => {
  const running = launch(0);
  try {
    const url = await running.ready;
    const response = await fetch(url + '/auth-config.json');
    assert.equal(response.status, 200);
    assert.ok((await response.json()).publishableKey.startsWith('sb_publishable_'));
  } finally { running.child.kill(); await running.exited; }
});

test('invalid and occupied explicit ports fail clearly without an uncaught stack', async () => {
  const blocker = net.createServer();
  blocker.listen(0, '127.0.0.1'); await once(blocker, 'listening');
  try {
    for (const port of ['not-a-port', '65536', '-1', String(blocker.address().port)]) {
      const result = spawnSync(process.execPath, [serverFile], { env: { ...process.env, PORT: port }, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /PORT must be|already in use/);
      assert.doesNotMatch(result.stderr, /Unhandled 'error' event|node:events/);
    }
  } finally { await new Promise(resolve => blocker.close(resolve)); }
});
