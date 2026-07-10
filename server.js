const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);

function cleanEnv(value) {
  if (value == null) return '';
  return String(value).trim().replace(/^["']|["']$/g, '');
}

const AUTH_EMAIL = cleanEnv(process.env.AUTH_EMAIL).toLowerCase();
const AUTH_PASSWORD = cleanEnv(process.env.AUTH_PASSWORD);
const AUTH_PASSWORD_HASH_RAW = cleanEnv(process.env.AUTH_PASSWORD_HASH);

app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));

app.use(session({
  secret: cleanEnv(process.env.SESSION_SECRET) || 'dev-only-change-in-production',
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
  return Boolean(AUTH_EMAIL && (AUTH_PASSWORD || AUTH_PASSWORD_HASH_RAW));
}

function isSha256Hex(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function passwordMatches(input) {
  if (AUTH_PASSWORD_HASH_RAW) {
    if (isSha256Hex(AUTH_PASSWORD_HASH_RAW)) {
      if (hashPassword(input) === AUTH_PASSWORD_HASH_RAW.toLowerCase()) return true;
    } else {
      const a = Buffer.from(input, 'utf8');
      const b = Buffer.from(AUTH_PASSWORD_HASH_RAW, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
  }
  if (AUTH_PASSWORD) {
    const a = Buffer.from(input, 'utf8');
    const b = Buffer.from(AUTH_PASSWORD, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

app.get('/api/session', (req, res) => {
  const at = AUTH_EMAIL.indexOf('@');
  const emailHint = at > 0
    ? `${AUTH_EMAIL.slice(0, 1)}***${AUTH_EMAIL.slice(at)}`
    : '***';

  res.json({
    authenticated: isAuthenticated(req),
    configured: authConfigured(),
    emailHint,
    authMode: AUTH_PASSWORD && AUTH_PASSWORD_HASH_RAW ? 'both' : AUTH_PASSWORD ? 'password' : 'hash',
  });
});

app.post('/api/login', (req, res) => {
  if (!authConfigured()) {
    return res.status(500).json({ error: 'Autenticacao nao configurada no servidor.' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (email === AUTH_EMAIL && passwordMatches(password)) {
    req.session.authenticated = true;
    return req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Erro ao iniciar sessao.' });
      return res.json({ ok: true });
    });
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
  console.log(`Auth configurado: ${authConfigured() ? 'sim' : 'nao'}`);
  if (!authConfigured()) {
    console.warn('Defina AUTH_EMAIL + AUTH_PASSWORD (ou AUTH_PASSWORD_HASH) no Railway.');
  }
});
