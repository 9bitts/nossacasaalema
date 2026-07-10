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
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function showLogin(error = '') {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  const errEl = document.getElementById('login-error');
  if (error) {
    errEl.textContent = error;
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

    const ok = await login(email, password);
    if (ok) {
      showApp();
      const { initApp } = await import('./app.js');
      initApp();
    } else {
      showLogin('E-mail ou senha incorretos.');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

async function boot() {
  if (await isLoggedIn()) {
    showApp();
    const { initApp } = await import('./app.js');
    initApp();
  } else {
    showLogin();
    setupLoginForm();
  }
}

boot();
