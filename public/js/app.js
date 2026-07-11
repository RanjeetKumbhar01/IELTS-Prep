/* ── Shared app utilities, API layer, theme management ── */

// ─── Theme ───────────────────────────────────────────────────────────────

const Theme = {
  init() {
    const saved = localStorage.getItem('ielts-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateToggles();
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ielts-theme', next);
    this.updateToggles();
  },
  updateToggles() {
    const theme = document.documentElement.getAttribute('data-theme');
    document.querySelectorAll('.theme-toggle-label').forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
  }
};

// ─── API Helper ───────────────────────────────────────────────────────────

const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

// ─── Toast ────────────────────────────────────────────────────────────────

const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(msg, type = 'info') {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    this.container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); }
};

// ─── Modal ────────────────────────────────────────────────────────────────

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
  }
};

// click outside to close
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function getScoreColor(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

function getSectionColor(section) {
  const map = { Listening: '#3b82f6', Reading: '#10b981', Writing: '#f59e0b', Speaking: '#8b5cf6' };
  return map[section] || 'var(--accent)';
}

function getSectionIcon(section) {
  const map = { Listening: '🎧', Reading: '📖', Writing: '✍️', Speaking: '🗣️' };
  return map[section] || '📋';
}

function getParams() {
  const params = {};
  new URLSearchParams(window.location.search).forEach((v, k) => params[k] = v);
  return params;
}

function setActiveNav() {
  const path = window.location.pathname.replace(/\//g, '');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.page && path.includes(el.dataset.page)) {
      el.classList.add('active');
    }
  });
  // Dashboard special case
  if (path === '' || path === 'indexhtml') {
    document.querySelector('[data-page="index"]')?.classList.add('active');
  }
}

// ─── IELTS Constants ─────────────────────────────────────────────────────

const IELTS = {
  QUESTION_TYPES: [
    'Multiple Choice',
    'True / False / Not Given',
    'Yes / No / Not Given',
    'Matching Headings',
    'Matching Information',
    'Matching Features',
    'Matching Sentence Endings',
    'Sentence Completion',
    'Summary Completion',
    'Note Completion',
    'Table Completion',
    'Flow-chart Completion',
    'Diagram Label Completion',
    'Short Answer',
    'Form Completion',
    'Map / Plan Labelling',
    'Other'
  ],
  LISTENING_PARTS: [
    { num: 1, context: 'Social conversation (e.g., booking, enquiry)', qRange: '1–10' },
    { num: 2, context: 'Monologue in social context (e.g., tour guide)', qRange: '11–20' },
    { num: 3, context: 'Academic discussion between 2–4 people', qRange: '21–30' },
    { num: 4, context: 'Academic lecture / monologue', qRange: '31–40' }
  ],
  READING_PASSAGES: [
    { num: 1, context: 'Passage 1 (easiest)', qRange: '1–13' },
    { num: 2, context: 'Passage 2', qRange: '14–26' },
    { num: 3, context: 'Passage 3 (hardest)', qRange: '27–40' }
  ],
  WRITING_TASKS: [
    { num: 1, context: 'Describe visual info (graph/chart/map/diagram)', minWords: 150 },
    { num: 2, context: 'Essay (argument/opinion/problem-solution)', minWords: 250 }
  ],
  SPEAKING_PARTS: [
    { num: 1, context: 'Introduction + familiar topics (4–5 min)' },
    { num: 2, context: 'Cue card — speak 1–2 min after 1 min prep' },
    { num: 3, context: 'Abstract discussion linked to Part 2 (4–5 min)' }
  ],
  TIME_LIMITS: {
    Listening: 30 * 60,
    Reading: 60 * 60,
    Writing: 60 * 60,
    Speaking: 14 * 60
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Toast.init();
  setActiveNav();

  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn, [data-action="toggle-theme"]').forEach(el => {
    el.addEventListener('click', () => Theme.toggle());
  });
});
