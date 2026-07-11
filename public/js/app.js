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
  getUserId() {
    let userId = localStorage.getItem('ielts_prep_user_id');
    if (!userId) {
      const match = document.cookie.match(/(?:^|; )ielts_prep_user_id=([^;]*)/);
      if (match) {
        userId = match[1];
      } else {
        userId = 'usr_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem('ielts_prep_user_id', userId);
    }
    // Sync to cookie with 1 year expiration
    document.cookie = `ielts_prep_user_id=${userId}; path=/; max-age=31536000; SameSite=Lax`;
    return userId;
  },
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.getUserId()
    };
  },
  async get(url) {
    const r = await fetch(url, {
      headers: { 'x-user-id': this.getUserId() }
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, {
      method: 'DELETE',
      headers: { 'x-user-id': this.getUserId() }
    });
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

// ─── Cookie Consent Banner ────────────────────────────────────────────────

const CookieConsent = {
  init() {
    const dismissed = localStorage.getItem('ielts_cookie_dismissed');
    if (dismissed) return;

    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      max-width: 380px;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-left: 4px solid var(--accent, #6366f1);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      color: #f1f5f9;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.5;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🎯</span>
        <strong style="font-weight:600;color:#fff;">Private Guest Workspace</strong>
      </div>
      <div>
        We use cookie storage to automatically create a private space for your IELTS tests. No signup required, your data remains separate from others.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button id="cookie-got-it" style="
          background: var(--accent, #6366f1);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        ">Got it</button>
      </div>
    `;

    document.body.appendChild(banner);

    // Trigger animation
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
    }, 100);

    const btn = banner.querySelector('#cookie-got-it');
    btn.style.backgroundColor = 'var(--accent, #6366f1)';
    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.filter = 'none';
    });
    btn.addEventListener('click', () => {
      banner.style.transform = 'translateY(50px)';
      banner.style.opacity = '0';
      localStorage.setItem('ielts_cookie_dismissed', 'true');
      setTimeout(() => banner.remove(), 500);
    });
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Toast.init();
  setActiveNav();
  CookieConsent.init();

  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn, [data-action="toggle-theme"]').forEach(el => {
    el.addEventListener('click', () => Theme.toggle());
  });
});
