// Book page logic

const params = getParams();
const BOOK_ID = params.id;
let currentBook = null;

// Set today as default date
document.getElementById('test-date').value = new Date().toISOString().split('T')[0];

async function loadBook() {
  if (!BOOK_ID) { window.location.href = '/'; return; }
  try {
    const books = await api.get('/api/books');
    currentBook = books.find(b => String(b.id) === String(BOOK_ID));
    if (!currentBook) { window.location.href = '/'; return; }

    document.title = `${currentBook.name} — IELTS Prep`;
    document.getElementById('book-title').textContent = currentBook.name;
    document.getElementById('breadcrumb-book').textContent = currentBook.name;

    // Pre-fill edit modal
    document.getElementById('edit-book-name').value = currentBook.name;

    await loadTests();
  } catch(e) {
    Toast.error('Failed to load book');
  }
}

async function loadTests() {
  try {
    const tests = await api.get(`/api/books/${BOOK_ID}/tests`);
    renderTests(tests);
    document.getElementById('book-subtitle').textContent =
      `${tests.length} test${tests.length !== 1 ? 's' : ''} · Added ${formatDate(currentBook.created_at)}`;
  } catch(e) {
    Toast.error('Failed to load tests');
  }
}

function renderTests(tests) {
  const list  = document.getElementById('tests-list');
  const empty = document.getElementById('tests-empty');
  list.innerHTML = '';

  if (!tests.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  const sectionGroups = [
    { name: 'Full Test', label: 'Full-length tests' },
    { name: 'Listening', label: 'Listening tests' },
    { name: 'Reading', label: 'Reading tests' },
    { name: 'Writing', label: 'Writing tests' },
    { name: 'Speaking', label: 'Speaking tests' }
  ];

  const groupedTests = new Map(sectionGroups.map(group => [group.name, []]));
  tests.forEach(test => {
    const section = groupedTests.has(test.test_section) ? test.test_section : 'Full Test';
    groupedTests.get(section).push(test);
  });

  sectionGroups.forEach(group => {
    const groupTests = groupedTests.get(group.name);
    if (!groupTests.length) return;

    groupTests.sort(compareTests);
    const section = document.createElement('section');
    section.className = 'test-list-section';
    section.innerHTML = `
      <div class="test-list-section-header">
        <h2>${group.label}</h2>
        <span>${groupTests.length} test${groupTests.length !== 1 ? 's' : ''}</span>
      </div>
    `;

    const cards = document.createElement('div');
    cards.className = 'test-list-section-cards';
    groupTests.forEach(test => cards.appendChild(createTestCard(test)));
    section.appendChild(cards);
    list.appendChild(section);
  });
}

function createTestCard(test) {
    const div = document.createElement('div');
    div.className = 'test-card animate-fade-in';
    div.innerHTML = `
      <div class="test-card-left">
        <div class="test-title">
          Test ${escapeHtml(test.test_number)}
          <span class="badge ${test.mode === 'mock' ? 'badge-purple' : 'badge-blue'}" style="margin-left:8px;">
            ${test.mode === 'mock' ? 'Mock' : 'Practice'}
          </span>
        </div>
        <div class="test-meta" style="margin-top:4px;">
          <span>Date: ${formatDate(test.date)}</span>
          <span>·</span>
          <span>${test.section_count} section${test.section_count !== 1 ? 's' : ''} filled</span>
          ${test.test_section && test.test_section !== 'Full Test' ? `<span>·</span><span>${escapeHtml(test.test_section)} only</span>` : ''}
          ${test.total_score !== null ? `<span>·</span><span class="score-pill">Band: ${test.total_score}</span>` : ''}
        </div>
        ${test.notes ? `<div style="margin-top:4px;font-size:12px;color:var(--text-secondary);">Notes: ${escapeHtml(test.notes)}</div>` : ''}
      </div>
      <div class="test-card-actions">
        <a href="/session.html?testId=${test.id}" class="btn btn-primary btn-sm">Open</a>
        <button class="btn btn-danger btn-sm" onclick="deleteTest(${test.id})">Delete</button>
      </div>
    `;
    return div;
}

function compareTests(a, b) {
  const numberComparison = String(a.test_number || '').localeCompare(
    String(b.test_number || ''),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
  if (numberComparison !== 0) return numberComparison;

  // Keep separate attempts with the same test number in newest-first date order.
  const dateComparison = String(b.date || '').localeCompare(String(a.date || ''));
  if (dateComparison !== 0) return dateComparison;

  return Number(b.id) - Number(a.id);
}

// ─── Edit Book ────────────────────────────────────────────────────────────

document.getElementById('btn-edit-book').addEventListener('click', () => {
  document.getElementById('edit-book-name').value = currentBook?.name || '';
  Modal.open('modal-edit-book');
});

document.getElementById('btn-save-edit-book').addEventListener('click', async () => {
  const name = document.getElementById('edit-book-name').value.trim();
  if (!name) { Toast.error('Please enter a book title'); return; }
  try {
    await api.put(`/api/books/${BOOK_ID}`, { name });
    Toast.success('Book updated');
    Modal.close('modal-edit-book');
    loadBook();
  } catch(e) {
    Toast.error('Failed to update book');
  }
});

document.getElementById('edit-book-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-save-edit-book').click();
});

// ─── Delete Book ──────────────────────────────────────────────────────────

document.getElementById('btn-delete-book').addEventListener('click', async () => {
  if (!confirm(`Delete "${currentBook?.name}" and all its tests? This cannot be undone.`)) return;
  try {
    await api.del(`/api/books/${BOOK_ID}`);
    Toast.success('Book deleted');
    setTimeout(() => window.location.href = '/', 600);
  } catch(e) {
    Toast.error('Failed to delete book');
  }
});

// ─── Create Test ──────────────────────────────────────────────────────────

document.getElementById('btn-new-test').addEventListener('click', () => Modal.open('modal-new-test'));

document.getElementById('btn-save-test').addEventListener('click', async () => {
  const testNum = document.getElementById('test-num').value.trim();
  const mode    = document.getElementById('test-mode').value;
  const date    = document.getElementById('test-date').value;
  const notes   = document.getElementById('test-notes').value.trim();
  const test_section = document.getElementById('test-section').value;

  if (!testNum) { Toast.error('Please enter a test number'); return; }
  try {
    const test = await api.post(`/api/books/${BOOK_ID}/tests`, { test_number: testNum, mode, date, notes, test_section });
    Modal.close('modal-new-test');
    Toast.success(`Test created`);
    window.location.href = `/session.html?testId=${test.id}`;
  } catch(e) {
    Toast.error('Failed to create test');
  }
});

// ─── Delete Test ──────────────────────────────────────────────────────────

async function deleteTest(id) {
  if (!confirm('Delete this test and all its data? This cannot be undone.')) return;
  try {
    await api.del(`/api/tests/${id}`);
    Toast.success('Test deleted');
    loadTests();
  } catch(e) {
    Toast.error('Failed to delete test');
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

loadBook();
