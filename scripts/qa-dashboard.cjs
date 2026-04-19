/**
 * Dashboard local QA · LCC
 *
 * Sert le dashboard HTML et expose les rapports Playwright + screenshots.
 * Pas de dépendance externe (utilise http natif Node).
 *
 * Usage : node scripts/qa-dashboard.cjs
 * Ouvre : http://localhost:9323
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const PORT = 9323;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

function lirejson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  } catch {
    return fallback;
  }
}

function servirFichier(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API : état global
  if (url.pathname === '/api/status') {
    const status = lirejson('qa-status.json', { ok: false, etapes: [], message: 'Aucun run encore' });
    const results = lirejson('qa-results.json', { stats: {} });
    const lighthouse = lirejson('lighthouse-results.json', []);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status, results, lighthouse }));
    return;
  }

  // API : lancer un run
  if (url.pathname === '/api/run' && req.method === 'POST') {
    const mode = url.searchParams.get('mode') || 'fast';
    const cmd = mode === 'full'
      ? 'node scripts/qa-run.cjs --perf'
      : mode === 'update-snaps'
        ? 'node scripts/qa-run.cjs --update-snaps'
        : 'node scripts/qa-run.cjs --fast';

    const child = spawn('sh', ['-c', cmd], { cwd: ROOT, detached: true });
    child.unref();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ lance: true, commande: cmd }));
    return;
  }

  // Rapport Playwright (HTML complet)
  if (url.pathname.startsWith('/playwright-report/')) {
    const fichier = path.join(ROOT, url.pathname);
    servirFichier(res, fichier);
    return;
  }

  // Dashboard principal
  if (url.pathname === '/' || url.pathname === '/index.html') {
    servirFichier(res, path.join(ROOT, 'dashboard', 'index.html'));
    return;
  }

  servirFichier(res, path.join(ROOT, 'dashboard', url.pathname));
});

server.listen(PORT, () => {
  console.log(`\n⚜  Dashboard QA · LCC\n`);
  console.log(`   → http://localhost:${PORT}\n`);
  // Auto-open (optionnel, commente si gênant)
  const opener = process.platform === 'win32' ? 'start'
    : process.platform === 'darwin' ? 'open'
    : 'xdg-open';
  exec(`${opener} http://localhost:${PORT}`);
});
