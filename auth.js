const SESSION_KEY = 'nossacasa_auth';

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isLoggedIn() {
  try {
    const res = await fetch('/api/session', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }
}

export async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  location.reload();
}

export async function login(email, password) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return { ok: true };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || 'E-mail ou senha incorretos.' };
  } catch {
    return { ok: false, error: 'Erro de conexao com o servidor.' };
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function showLogin(error = '', isHint = false) {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  const errEl = document.getElementById('login-error');
  if (error) {
    errEl.textContent = error;
    errEl.classList.toggle('login-hint', isHint);
    errEl.classList.remove('hidden');
  } else {
    errEl.classList.add('hidden');
  }
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    const result = await login(email, password);
    if (result.ok) {
      showApp();
      const { initApp } = await import('./app.js');
      initApp();
    } else {
      let msg = result.error || 'E-mail ou senha incorretos.';
      try {
        const check = await fetch('/api/session');
        const data = await check.json();
        if (!data.configured) {
          msg = 'Servidor sem credenciais. Configure AUTH_EMAIL e AUTH_PASSWORD no Railway.';
        } else if (data.emailHint) {
          msg += ` E-mail esperado: ${data.emailHint}`;
        }
      } catch { /* ignore */ }
      showLogin(msg);
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

async function boot() {
  let sessionInfo = { configured: false, emailHint: '' };
  try {
    const res = await fetch('/api/session', { credentials: 'same-origin' });
    sessionInfo = await res.json();
  } catch { /* ignore */ }

  if (await isLoggedIn()) {
    showApp();
    const { initApp } = await import('./app.js');
    initApp();
  } else {
    const hint = sessionInfo.emailHint
      ? `Servidor espera o e-mail: ${sessionInfo.emailHint}`
      : '';
    showLogin(hint, true);
    setupLoginForm();
  }
}

boot();
