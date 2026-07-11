// Dashboard logic

async function loadDashboard() {
  try {
    const [overview] = await Promise.all([
      api.get('/api/analytics/overview')
    ]);

    // Stats
    document.getElementById('stat-books').textContent = overview.totalBooks;
    document.getElementById('stat-tests').textContent = overview.totalTests;

    const listenStat = overview.avgScores.find(s => s.section_type === 'Listening');
    const readStat   = overview.avgScores.find(s => s.section_type === 'Reading');
    document.getElementById('stat-listen').textContent = listenStat ? Math.round(listenStat.avg_pct) + '%' : '—';
    document.getElementById('stat-read').textContent   = readStat ? Math.round(readStat.avg_pct) + '%' : '—';

    // Recent tests
    renderRecentTests(overview.recentTests);

    // Books
    const books = await api.get('/api/books');
    renderBooks(books);
  } catch(err) {
    Toast.error('Failed to load dashboard data');
    console.error(err);
  }
}

function renderBooks(books) {
  const grid  = document.getElementById('books-grid');
  const empty = document.getElementById('books-empty');
  grid.innerHTML = '';

  if (!books.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  books.forEach(book => {
    const card = document.createElement('div');
    card.className = 'book-card animate-fade-in';
    card.innerHTML = `
      <div onclick="window.location.href='/book.html?id=${book.id}'" style="cursor:pointer;">
        <div class="book-name">${escapeHtml(book.name)}</div>
        <div class="book-meta">${book.test_count} test${book.test_count !== 1 ? 's' : ''} · Added ${formatDate(book.created_at)}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" style="flex:1;"
          onclick="event.stopPropagation(); openEditBook(${book.id}, '${escapeJs(book.name)}')">Edit</button>
        <button class="btn btn-danger btn-sm" style="flex:1;"
          onclick="event.stopPropagation(); deleteBook(${book.id})">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderRecentTests(tests) {
  const list = document.getElementById('recent-tests-list');
  const empty = document.getElementById('recent-empty');
  list.innerHTML = '';

  if (!tests.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tests.forEach(t => {
    const div = document.createElement('div');
    div.className = 'test-card animate-fade-in';
    div.innerHTML = `
      <div class="test-card-left">
        <div class="test-title">Test ${escapeHtml(t.test_number)}</div>
        <div class="test-meta">
          <span>${escapeHtml(t.book_name)}</span>
          <span>·</span>
          <span>${formatDate(t.date)}</span>
          <span>·</span>
          <span class="badge ${t.mode === 'mock' ? 'badge-purple' : 'badge-blue'}">${t.mode === 'mock' ? 'Mock' : 'Practice'}</span>
          ${t.total_score ? `<span class="score-pill">Band: ${t.total_score}</span>` : ''}
        </div>
      </div>
      <div class="test-card-actions">
        <a href="/session.html?testId=${t.id}" class="btn btn-primary btn-sm">Open</a>
      </div>
    `;
    list.appendChild(div);
  });
}

async function deleteBook(id) {
  if (!confirm('Delete this book and all its tests? This cannot be undone.')) return;
  try {
    await api.del(`/api/books/${id}`);
    Toast.success('Book deleted');
    loadDashboard();
  } catch(e) {
    Toast.error('Failed to delete book');
  }
}

let editingBookId = null;
function openEditBook(id, name) {
  editingBookId = id;
  document.getElementById('edit-book-name-dash').value = name;
  Modal.open('modal-edit-book-dash');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function escapeJs(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ─── Events ───────────────────────────────────────────────────────────────

document.getElementById('btn-new-book').addEventListener('click', () => Modal.open('modal-add-book'));
document.getElementById('btn-new-book-2')?.addEventListener('click', () => Modal.open('modal-add-book'));

const bookInput = document.getElementById('book-name-input');
bookInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBook(); });
document.getElementById('btn-save-book').addEventListener('click', saveBook);

async function saveBook() {
  const name = bookInput.value.trim();
  if (!name) { Toast.error('Please enter a book title'); return; }
  try {
    await api.post('/api/books', { name });
    Toast.success('Book added');
    bookInput.value = '';
    Modal.close('modal-add-book');
    loadDashboard();
  } catch(e) {
    Toast.error('Failed to add book');
  }
}

// Edit book from dashboard
document.getElementById('btn-save-edit-book-dash')?.addEventListener('click', async () => {
  const name = document.getElementById('edit-book-name-dash')?.value.trim();
  if (!name || !editingBookId) return;
  try {
    await api.put(`/api/books/${editingBookId}`, { name });
    Toast.success('Book updated');
    Modal.close('modal-edit-book-dash');
    loadDashboard();
  } catch(e) {
    Toast.error('Failed to update book');
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────
loadDashboard();
