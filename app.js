const REPO = '9bitts/nossacasaalema';
const API_BASE = `https://api.github.com/repos/${REPO}`;

let manifest = null;
let activeCategory = 'all';
let searchQuery = '';

const els = {
  search: document.getElementById('search'),
  searchCount: document.getElementById('search-count'),
  categoryFilters: document.getElementById('category-filters'),
  docGrid: document.getElementById('doc-grid'),
  emptyState: document.getElementById('empty-state'),
  stats: document.getElementById('stats'),
  uploadDialog: document.getElementById('upload-dialog'),
  uploadForm: document.getElementById('upload-form'),
  uploadCategory: document.getElementById('upload-category'),
  uploadFiles: document.getElementById('upload-files'),
  githubToken: document.getElementById('github-token'),
  uploadProgress: document.getElementById('upload-progress'),
  progressFill: document.getElementById('progress-fill'),
  uploadStatus: document.getElementById('upload-status'),
};

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function getFilteredDocs() {
  if (!manifest) return [];
  return manifest.documents.filter((doc) => {
    const matchCategory = activeCategory === 'all' || doc.category === activeCategory;
    if (!matchCategory) return false;
    if (!searchQuery) return true;
    const haystack = normalize(`${doc.name} ${doc.categoryLabel} ${doc.category} ${doc.extension}`);
    return haystack.includes(normalize(searchQuery));
  });
}

function renderCategoryFilters() {
  const counts = {};
  for (const doc of manifest.documents) {
    counts[doc.category] = (counts[doc.category] || 0) + 1;
  }

  els.categoryFilters.innerHTML = Object.entries(manifest.categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => `
      <button type="button" class="category-chip${activeCategory === key ? ' active' : ''}" data-category="${key}">
        ${label}
        <span class="count">${counts[key] || 0}</span>
      </button>
    `).join('');

  els.categoryFilters.querySelectorAll('.category-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      document.querySelector('[data-category="all"]').classList.toggle('active', false);
      els.categoryFilters.querySelectorAll('.category-chip').forEach((b) => {
        b.classList.toggle('active', b.dataset.category === activeCategory);
      });
      render();
    });
  });

  document.querySelector('[data-category="all"]').addEventListener('click', () => {
    activeCategory = 'all';
    document.querySelector('[data-category="all"]').classList.add('active');
    els.categoryFilters.querySelectorAll('.category-chip').forEach((b) => b.classList.remove('active'));
    render();
  });
}

function renderDocs(docs) {
  els.docGrid.innerHTML = docs.map((doc) => {
    const ext = doc.extension || 'other';
    const iconClass = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'].includes(ext) ? ext : 'other';
    const viewUrl = doc.path;
    const downloadUrl = `${doc.path}?download=1`;

    return `
      <article class="doc-card" data-id="${doc.id}">
        <div class="doc-card-header">
          <div class="file-icon ${iconClass}">${ext.slice(0, 4)}</div>
          <div>
            <div class="doc-name" title="${doc.name}">${doc.name}</div>
            <span class="doc-category">${doc.categoryLabel}</span>
          </div>
        </div>
        <div class="doc-meta">
          <span>${formatSize(doc.size)}</span>
          <span>${ext.toUpperCase()}</span>
        </div>
        <div class="doc-actions">
          <a class="btn btn-outline" href="${viewUrl}" target="_blank" rel="noopener">Abrir</a>
          <a class="btn btn-outline btn-download" href="${downloadUrl}" download="${doc.name}">Download</a>
        </div>
      </article>
    `;
  }).join('');

  els.emptyState.classList.toggle('hidden', docs.length > 0);
}

function render() {
  const docs = getFilteredDocs();
  els.searchCount.textContent = `${docs.length} de ${manifest.documents.length}`;
  els.stats.textContent = activeCategory === 'all'
    ? `${manifest.documents.length} documentos em ${Object.keys(manifest.categories).length} categorias`
    : `${docs.length} documento(s) em "${manifest.categories[activeCategory] || activeCategory}"`;
  renderDocs(docs);
}

async function loadManifest() {
  const res = await fetch(`manifest.json?t=${Date.now()}`);
  if (!res.ok) throw new Error('Não foi possível carregar manifest.json');
  manifest = await res.json();
}

function populateUploadCategories() {
  els.uploadCategory.innerHTML = Object.entries(manifest.categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join('');
}

function restoreToken() {
  const saved = sessionStorage.getItem('github_pat');
  if (saved) els.githubToken.value = saved;
}

function saveToken(token) {
  if (token) sessionStorage.setItem('github_pat', token);
}

function encodeRepoPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function getFileSha(path, token) {
  const res = await fetch(`${API_BASE}/contents/${encodeRepoPath(path)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Erro ao verificar arquivo: ${res.status}`);
  const data = await res.json();
  return data.sha;
}

async function uploadToGitHub(path, content, message, token) {
  const sha = await getFileSha(path, token);
  const body = {
    message,
    content: arrayBufferToBase64(content),
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API_BASE}/contents/${encodeRepoPath(path)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload falhou (${res.status})`);
  }
  return res.json();
}

async function handleUpload(e) {
  e.preventDefault();
  const token = els.githubToken.value.trim();
  const category = els.uploadCategory.value;
  const files = [...els.uploadFiles.files];

  if (!token) {
    alert('Informe o token do GitHub.');
    return;
  }
  if (!files.length) {
    alert('Selecione ao menos um arquivo.');
    return;
  }

  saveToken(token);
  els.uploadProgress.classList.remove('hidden');
  els.btnSubmitUpload = document.getElementById('btn-submit-upload');
  els.btnSubmitUpload.disabled = true;

  const newDocs = [];
  let done = 0;

  try {
    for (const file of files) {
      els.uploadStatus.textContent = `Enviando ${file.name} (${done + 1}/${files.length})...`;
      const path = `Organizado/${category}/${file.name}`;
      const buffer = await file.arrayBuffer();
      await uploadToGitHub(path, buffer, `Adicionar documento: ${file.name}`, token);

      newDocs.push({
        id: crypto.randomUUID(),
        name: file.name,
        category,
        categoryLabel: manifest.categories[category],
        path,
        size: file.size,
        extension: file.name.split('.').pop()?.toLowerCase() || '',
        updatedAt: new Date().toISOString(),
      });
      done++;
      els.progressFill.style.width = `${(done / files.length) * 80}%`;
    }

    manifest.documents.push(...newDocs);
    manifest.total = manifest.documents.length;
    manifest.generatedAt = new Date().toISOString();

    els.uploadStatus.textContent = 'Atualizando índice...';
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestBytes = new TextEncoder().encode(manifestJson);
    await uploadToGitHub('manifest.json', manifestBytes, `Atualizar manifest (${newDocs.length} doc(s))`, token);

    els.progressFill.style.width = '100%';
    els.uploadStatus.textContent = `${files.length} arquivo(s) enviado(s) com sucesso!`;
    els.uploadFiles.value = '';
    renderCategoryFilters();
    render();

    setTimeout(() => {
      els.uploadDialog.close();
      els.uploadProgress.classList.add('hidden');
      els.progressFill.style.width = '0%';
    }, 1500);
  } catch (err) {
    els.uploadStatus.textContent = `Erro: ${err.message}`;
    alert(`Falha no upload: ${err.message}`);
  } finally {
    document.getElementById('btn-submit-upload').disabled = false;
  }
}

function setupUploadDialog() {
  document.getElementById('btn-upload-toggle').addEventListener('click', () => {
    populateUploadCategories();
    els.uploadDialog.showModal();
  });
  document.getElementById('btn-close-upload').addEventListener('click', () => els.uploadDialog.close());
  document.getElementById('btn-cancel-upload').addEventListener('click', () => els.uploadDialog.close());
  els.uploadForm.addEventListener('submit', handleUpload);
}

export async function initApp() {
  restoreToken();
  setupUploadDialog();

  document.getElementById('btn-logout').addEventListener('click', async () => {
    const { logout } = await import('./auth.js');
    logout();
  });

  els.search.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    render();
  });

  try {
    await loadManifest();
    renderCategoryFilters();
    populateUploadCategories();
    render();
  } catch (err) {
    els.docGrid.innerHTML = `<p class="empty-state">Erro ao carregar documentos: ${err.message}</p>`;
  }
}
