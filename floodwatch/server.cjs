// Local static preview. No dependencies. Run: node server.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  let target;
  try { target = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch { response.writeHead(400).end('Bad request'); return; }
  if (target === root) target = path.join(root, 'index.html');
  if (!target.startsWith(root + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  fs.readFile(target, (error, content) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    response.end(content);
  });
});
const explicitPort = process.env.PORT !== undefined && process.env.PORT !== '';
let port = explicitPort ? Number(process.env.PORT) : 4173;
if (!Number.isInteger(port) || port < 0 || port > 65535 || (explicitPort && !/^\d+$/.test(process.env.PORT))) {
  console.error('PORT must be a whole number between 0 and 65535.');
  process.exitCode = 1;
} else {
  let retries = 0;
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && !explicitPort && retries < 20) {
      if (retries === 0) console.warn('Port 4173 is busy; choosing the next available port.');
      retries++;
      server.listen(++port, '127.0.0.1');
      return;
    }
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Set a different PORT or stop the existing server.`
      : `Could not start FloodWatch: ${error.code || error.message}`);
    process.exitCode = 1;
  });
  server.once('listening', () => {
    const url = 'http://127.0.0.1:' + server.address().port;
    console.log('Local: ' + url);
    console.log('Keep this terminal open. Press Ctrl+C to stop.');
    if (server.address().port !== 4173) console.log('For signup/recovery email links, allow ' + url + '/ in Supabase Redirect URLs.');
  });
  const stop = () => { server.close(() => process.exit(0)); server.closeAllConnections(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.listen(port, '127.0.0.1');
}
