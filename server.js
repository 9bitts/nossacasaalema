const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

function hashPassword(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

function isAuthenticated(req) {
  return req.session.authenticated === true;
}

const PUBLIC_PATHS = new Set(['/', '/index.html', '/styles.css', '/auth.js']);

function authConfigured() {
  return Boolean(process.env.AUTH_EMAIL && process.env.AUTH_PASSWORD_HASH);
}

app.get('/api/session', (req, res) => {
  res.json({ authenticated: isAuthenticated(req), configured: authConfigured() });
});

app.post('/api/login', (req, res) => {
  if (!authConfigured()) {
    return res.status(500).json({ error: 'Autenticacao nao configurada no servidor.' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const expectedEmail = process.env.AUTH_EMAIL.trim().toLowerCase();
  const expectedHash = process.env.AUTH_PASSWORD_HASH.trim().toLowerCase();
  const hash = hashPassword(password);

  if (email === expectedEmail && hash === expectedHash) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Erro ao sair.' });
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (PUBLIC_PATHS.has(req.path)) return next();
  if (isAuthenticated(req)) return next();
  return res.status(401).type('text/plain').send('Acesso negado. Faca login em /');
});

app.use(express.static(path.join(__dirname), { index: 'index.html' }));

app.use((req, res) => {
  if (isAuthenticated(req)) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  return res.status(401).type('text/plain').send('Acesso negado. Faca login em /');
});

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
  if (!authConfigured()) {
    console.warn('AVISO: defina AUTH_EMAIL e AUTH_PASSWORD_HASH nas variaveis de ambiente.');
  }
});
