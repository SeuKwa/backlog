import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dir, port, base = ''] = process.argv.slice(2);
const root = path.resolve(dir);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (base && p.startsWith(base)) p = p.slice(base.length) || '/';
  let file = path.join(root, p);
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const index = path.join(file, 'index.html');
    if (fs.existsSync(index)) {
      file = index;
    } else {
      file = path.join(root, '200.html');
    }
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(Number(port), '127.0.0.1', () => {
  console.log(`serve-static: http://127.0.0.1:${port}${base || '/'}`);
});
