/* ── Shared app utilities, API layer, layout config ── */

// ─── Theme Switcher Initialization ──────────────────────────────────────────
(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

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
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    this.container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
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
  const map = { Listening: '#0284c7', Reading: '#059669', Writing: '#d97706', Speaking: '#7c3aed' };
  return map[section] || 'var(--accent)';
}

function getSectionIcon(section) {
  return ''; // Emojis removed for professional theme
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
    'MCQ',
    'One Word/Number',
    'True / False / Not Given',
    'Matching',
    'Sentence Completion',
    'Table Completion',
    'Flow-chart Completion',
    'Diagram Label Completion',
    'Map / Plan Labelling'
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

// ─── AI Evaluation Configuration Helper (Google Gemini) ───────────────────

const IELTS_AI = {
  DEFAULT_MODEL: 'gemini-3.5-flash',
  MODELS: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Fast & Accurate)', provider: 'Google' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Latest Standard)', provider: 'Google' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (High Performance)', provider: 'Google' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Superfast)', provider: 'Google' }
  ],
  getApiKey() {
    return localStorage.getItem('ielts_gemini_api_key') || '';
  },
  setApiKey(key) {
    localStorage.setItem('ielts_gemini_api_key', (key || '').trim());
  },
  getModel() {
    return localStorage.getItem('ielts_gemini_model') || this.DEFAULT_MODEL;
  },
  setModel(model) {
    localStorage.setItem('ielts_gemini_model', (model || '').trim());
  },
  async evaluateWriting({ text, taskNumber, questionPrompt, modelNotes }) {
    const apiKey = this.getApiKey();
    const model = this.getModel();
    return await api.post('/api/ai/evaluate-writing', {
      text,
      task_number: taskNumber,
      question_prompt: questionPrompt,
      model_notes: modelNotes,
      api_key: apiKey || undefined,
      model: model
    });
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
      bottom: 20px;
      right: 20px;
      max-width: 340px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent, #2563eb);
      border-radius: 6px;
      padding: 12px 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 12px;
      line-height: 1.5;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transform: translateY(50px);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <strong style="font-weight:600;color:var(--text-primary);">Private Guest Workspace</strong>
      </div>
      <div>
        This app uses a private local session to store your IELTS tests. All data is kept locally or securely connected to your personal cloud deployment.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button id="cookie-got-it" style="
          background: var(--accent, #2563eb);
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        ">Got it</button>
      </div>
    `;

    document.body.appendChild(banner);

    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
      banner.style.opacity = '1';
    }, 100);

    const btn = banner.querySelector('#cookie-got-it');
    btn.addEventListener('click', () => {
      banner.style.transform = 'translateY(20px)';
      banner.style.opacity = '0';
      localStorage.setItem('ielts_cookie_dismissed', 'true');
      setTimeout(() => banner.remove(), 300);
    });
  }
};

// ─── Theme Switcher Toggle & IELTS Band Helper ────────────────────────────

function updateThemeToggleUI(theme) {
  const toggleIcon = document.getElementById('theme-toggle-icon');
  const toggleText = document.getElementById('theme-toggle-text');
  if (!toggleIcon || !toggleText) return;
  if (theme === 'dark') {
    toggleIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    toggleText.textContent = 'Light Mode';
  } else {
    toggleIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    toggleText.textContent = 'Dark Mode';
  }
}

function initThemeToggler() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeToggleUI(currentTheme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const themeNow = document.documentElement.getAttribute('data-theme') || 'light';
      const targetTheme = themeNow === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', targetTheme);
      localStorage.setItem('theme', targetTheme);
      updateThemeToggleUI(targetTheme);
      
      // Dispatch custom event so that charts can re-render
      window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: targetTheme } }));
    });
  }
}

function calculateListeningBand(correct) {
  if (correct >= 39) return 9.0;
  if (correct >= 37) return 8.5;
  if (correct >= 35) return 8.0;
  if (correct >= 32) return 7.5;
  if (correct >= 30) return 7.0;
  if (correct >= 26) return 6.5;
  if (correct >= 23) return 6.0;
  if (correct >= 20) return 5.5;
  if (correct >= 16) return 5.0;
  if (correct >= 13) return 4.5;
  if (correct >= 10) return 4.0;
  if (correct >= 6) return 3.5;
  if (correct >= 4) return 3.0;
  if (correct >= 2) return 2.5;
  if (correct >= 1) return 2.0;
  return 0.0;
}

// Map Academic reading raw scores to IELTS band scores
function calculateReadingBand(correct) {
  if (correct >= 39) return 9.0;
  if (correct >= 37) return 8.5;
  if (correct >= 35) return 8.0;
  if (correct >= 33) return 7.5;
  if (correct >= 30) return 7.0;
  if (correct >= 27) return 6.5;
  if (correct >= 23) return 6.0;
  if (correct >= 19) return 5.5;
  if (correct >= 15) return 5.0;
  if (correct >= 13) return 4.5;
  if (correct >= 10) return 4.0;
  if (correct >= 6) return 3.5;
  if (correct >= 4) return 3.0;
  if (correct >= 2) return 2.5;
  if (correct >= 1) return 2.0;
  return 0.0;
}

function roundToIeltsBand(score) {
  const integerPart = Math.floor(score);
  const fractionalPart = score - integerPart;
  if (fractionalPart < 0.25) {
    return integerPart;
  } else if (fractionalPart < 0.75) {
    return integerPart + 0.5;
  } else {
    return integerPart + 1.0;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  setActiveNav();
  CookieConsent.init();
  initThemeToggler();
});
