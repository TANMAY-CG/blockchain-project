const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.SEALED_PROBLEMS_PORT || 4600);
const LOG_FILE = path.join(__dirname, 'sealed-problems.log.jsonl');
const PAGE_FILE = path.join(__dirname, '..', 'frontend', 'sealed-problems.html');

if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf8');

function nowISO() {
  return new Date().toISOString();
}

function writeProblem(problem) {
  const line = JSON.stringify(problem) + '\n';
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function parseProblems(limit = 300) {
  const raw = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // ignore malformed line
    }
  }
  return parsed.slice(-limit).reverse();
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

process.on('uncaughtException', (error) => {
  writeProblem({
    when: nowISO(),
    where: 'problems-server:uncaughtException',
    how: 'Unhandled runtime exception in problems server',
    severity: 'Critical',
    error: error?.stack || String(error),
  });
});

process.on('unhandledRejection', (reason) => {
  writeProblem({
    when: nowISO(),
    where: 'problems-server:unhandledRejection',
    how: 'Unhandled promise rejection in problems server',
    severity: 'High',
    error: reason?.stack || String(reason),
  });
});

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'GET' && reqUrl.pathname === '/') {
    const html = fs.readFileSync(PAGE_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/problems') {
    const limit = Number(reqUrl.searchParams.get('limit') || 300);
    return sendJson(res, 200, { items: parseProblems(limit) });
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/problems') {
    try {
      const body = await readBody(req);
      const data = JSON.parse(body || '{}');
      const problem = {
        when: data.when || nowISO(),
        where: data.where || 'unknown',
        how: data.how || 'unspecified',
        severity: data.severity || 'Medium',
        error: data.error || 'No error details provided',
      };
      writeProblem(problem);
      return sendJson(res, 201, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, message: 'Invalid JSON body', error: String(err) });
    }
  }

  return sendJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Sealed Problems server running at http://localhost:${PORT}`);
});

