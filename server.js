const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB Init (async) ──────────────────────────────────────────────────────

let db;
require('./database').then(d => {
  db = d;
  console.log('✅ Database ready');
  startServer();
}).catch(err => {
  console.error('❌ DB init failed:', err);
  process.exit(1);
});

// ─── BOOKS ────────────────────────────────────────────────────────────────

function registerRoutes() {

  app.get('/api/books', (req, res) => {
    try {
      const books = db.all(`
        SELECT b.id, b.name, b.created_at,
          (SELECT COUNT(*) FROM tests t WHERE t.book_id = b.id) as test_count
        FROM books b
        ORDER BY b.id DESC
      `);
      res.json(books);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/books', (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Book name required' });
      const now = new Date().toLocaleString('sv').replace(' ','T');
      const result = db.run('INSERT INTO books (name, created_at) VALUES (?, ?)', [name.trim(), now]);
      const book = db.get('SELECT * FROM books WHERE id = ?', [result.lastInsertRowid]);
      res.json(book);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/books/:id', (req, res) => {
    try {
      const { name } = req.body;
      db.run('UPDATE books SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/books/:id', (req, res) => {
    try {
      // Cascade manually
      const tests = db.all('SELECT id FROM tests WHERE book_id = ?', [req.params.id]);
      for (const t of tests) {
        const sections = db.all('SELECT id FROM sections WHERE test_id = ?', [t.id]);
        for (const s of sections) {
          db.run('DELETE FROM questions WHERE section_id = ?', [s.id]);
        }
        db.run('DELETE FROM sections WHERE test_id = ?', [t.id]);
      }
      db.run('DELETE FROM tests WHERE book_id = ?', [req.params.id]);
      db.run('DELETE FROM books WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ─── TESTS ──────────────────────────────────────────────────────────────

  app.get('/api/books/:bookId/tests', (req, res) => {
    try {
      const tests = db.all(`
        SELECT t.*, 
          (SELECT COUNT(*) FROM sections s WHERE s.test_id = t.id) as section_count
        FROM tests t
        WHERE t.book_id = ?
        ORDER BY t.id DESC
      `, [req.params.bookId]);
      res.json(tests);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/tests/:id', (req, res) => {
    try {
      const test = db.get('SELECT * FROM tests WHERE id = ?', [req.params.id]);
      if (!test) return res.status(404).json({ error: 'Test not found' });
      res.json(test);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/books/:bookId/tests', (req, res) => {
    try {
      const { test_number, mode, date, notes } = req.body;
      const now = new Date().toLocaleString('sv').replace(' ','T');
      const d = date || new Date().toISOString().split('T')[0];
      const result = db.run(
        'INSERT INTO tests (book_id, test_number, mode, date, notes, created_at) VALUES (?,?,?,?,?,?)',
        [req.params.bookId, test_number, mode || 'practice', d, notes || '', now]
      );
      const test = db.get('SELECT * FROM tests WHERE id = ?', [result.lastInsertRowid]);
      res.json(test);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/tests/:id', (req, res) => {
    try {
      const { test_number, mode, date, total_score, notes } = req.body;
      db.run(
        'UPDATE tests SET test_number=?, mode=?, date=?, total_score=?, notes=? WHERE id=?',
        [test_number, mode, date, total_score ?? null, notes || '', req.params.id]
      );
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/tests/:id', (req, res) => {
    try {
      const sections = db.all('SELECT id FROM sections WHERE test_id = ?', [req.params.id]);
      for (const s of sections) {
        db.run('DELETE FROM questions WHERE section_id = ?', [s.id]);
      }
      db.run('DELETE FROM sections WHERE test_id = ?', [req.params.id]);
      db.run('DELETE FROM tests WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ─── SECTIONS ────────────────────────────────────────────────────────────

  app.get('/api/tests/:testId/sections', (req, res) => {
    try {
      const sections = db.all(`
        SELECT s.*,
          (SELECT COUNT(*) FROM questions q WHERE q.section_id = s.id) as question_count,
          (SELECT COUNT(*) FROM questions q WHERE q.section_id = s.id AND q.is_correct = 1) as correct_count
        FROM sections s WHERE s.test_id = ?
        ORDER BY s.section_type, s.part_number
      `, [req.params.testId]);
      res.json(sections);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/tests/:testId/sections', (req, res) => {
    try {
      const { section_type, part_number, time_taken_seconds, score, max_score, notes } = req.body;
      const pn = part_number || 1;

      const existing = db.get(
        'SELECT id FROM sections WHERE test_id=? AND section_type=? AND part_number=?',
        [req.params.testId, section_type, pn]
      );

      let sectionId;
      if (existing) {
        db.run(
          'UPDATE sections SET time_taken_seconds=?, score=?, max_score=?, notes=? WHERE id=?',
          [time_taken_seconds || 0, score || 0, max_score || 0, notes || '', existing.id]
        );
        sectionId = existing.id;
      } else {
        const now = new Date().toLocaleString('sv').replace(' ','T');
        const result = db.run(
          'INSERT INTO sections (test_id, section_type, part_number, time_taken_seconds, score, max_score, notes, created_at) VALUES (?,?,?,?,?,?,?,?)',
          [req.params.testId, section_type, pn, time_taken_seconds || 0, score || 0, max_score || 0, notes || '', now]
        );
        sectionId = result.lastInsertRowid;
      }

      const section = db.get('SELECT * FROM sections WHERE id = ?', [sectionId]);
      res.json(section);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ─── QUESTIONS ───────────────────────────────────────────────────────────

  app.get('/api/sections/:sectionId/questions', (req, res) => {
    try {
      const questions = db.all(
        'SELECT * FROM questions WHERE section_id = ? ORDER BY question_number',
        [req.params.sectionId]
      );
      res.json(questions);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/sections/:sectionId/questions/bulk', (req, res) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions must be array' });

      const secId = parseInt(req.params.sectionId);
      for (const q of questions) {
        const existing = db.get(
          'SELECT id FROM questions WHERE section_id=? AND question_number=?',
          [secId, q.question_number]
        );
        if (existing) {
          db.run(
            'UPDATE questions SET question_type=?, my_answer=?, correct_answer=?, is_correct=?, personal_note=?, word_count=? WHERE id=?',
            [q.question_type||'', q.my_answer||'', q.correct_answer||'', q.is_correct ?? null, q.personal_note||'', q.word_count||0, existing.id]
          );
        } else {
          db.run(
            'INSERT INTO questions (section_id, question_number, question_type, my_answer, correct_answer, is_correct, personal_note, word_count) VALUES (?,?,?,?,?,?,?,?)',
            [secId, q.question_number, q.question_type||'', q.my_answer||'', q.correct_answer||'', q.is_correct ?? null, q.personal_note||'', q.word_count||0]
          );
        }
      }
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ─── ANALYTICS ───────────────────────────────────────────────────────────

  app.get('/api/analytics/overview', (req, res) => {
    try {
      const totalTests = db.get('SELECT COUNT(*) as count FROM tests') || { count: 0 };
      const totalBooks = db.get('SELECT COUNT(*) as count FROM books') || { count: 0 };
      const avgScores = db.all(`
        SELECT section_type, 
          AVG(CASE WHEN max_score > 0 THEN (CAST(score AS REAL) * 100.0 / max_score) ELSE NULL END) as avg_pct,
          AVG(score) as avg_score
        FROM sections
        GROUP BY section_type
      `);
      const recentTests = db.all(`
        SELECT t.*, b.name as book_name 
        FROM tests t JOIN books b ON b.id = t.book_id
        ORDER BY t.id DESC LIMIT 5
      `);
      res.json({
        totalTests: totalTests.count,
        totalBooks: totalBooks.count,
        avgScores,
        recentTests
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/analytics/progress', (req, res) => {
    try {
      const bySection = db.all(`
        SELECT t.date, s.section_type, s.score, s.max_score,
          CASE WHEN s.max_score > 0 THEN ROUND(CAST(s.score AS REAL) * 100.0 / s.max_score, 1) ELSE 0 END as pct,
          b.name as book_name, t.test_number
        FROM sections s
        JOIN tests t ON t.id = s.test_id
        JOIN books b ON b.id = t.book_id
        ORDER BY t.date ASC
      `);
      const byQuestionType = db.all(`
        SELECT q.question_type,
          COUNT(*) as total,
          SUM(CASE WHEN q.is_correct = 1 THEN 1 ELSE 0 END) as correct
        FROM questions q
        WHERE q.question_type != '' AND q.is_correct IS NOT NULL
        GROUP BY q.question_type
        ORDER BY total DESC
      `);
      res.json({ bySection, byQuestionType });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/analytics/tests', (req, res) => {
    try {
      const tests = db.all(`
        SELECT t.*, b.name as book_name,
          (SELECT COUNT(*) FROM sections s WHERE s.test_id = t.id) as section_count
        FROM tests t JOIN books b ON b.id = t.book_id
        ORDER BY t.date DESC
      `);
      res.json(tests);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ─── BACKUP / RESTORE ────────────────────────────────────────────────────

  app.get('/api/backup', (req, res) => {
    try {
      const books     = db.all('SELECT * FROM books');
      const tests     = db.all('SELECT * FROM tests');
      const sections  = db.all('SELECT * FROM sections');
      const questions = db.all('SELECT * FROM questions');
      res.json({ exported_at: new Date().toISOString(), books, tests, sections, questions });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/restore', (req, res) => {
    try {
      const { books = [], tests = [], sections = [], questions = [] } = req.body;
      db.run('DELETE FROM questions');
      db.run('DELETE FROM sections');
      db.run('DELETE FROM tests');
      db.run('DELETE FROM books');
      for (const b of books) {
        db.run('INSERT INTO books (id, name, created_at) VALUES (?,?,?)', [b.id, b.name, b.created_at]);
      }
      for (const t of tests) {
        db.run('INSERT INTO tests (id, book_id, test_number, mode, date, total_score, notes, created_at) VALUES (?,?,?,?,?,?,?,?)',
          [t.id, t.book_id, t.test_number, t.mode, t.date, t.total_score, t.notes, t.created_at]);
      }
      for (const s of sections) {
        db.run('INSERT INTO sections (id, test_id, section_type, part_number, time_taken_seconds, score, max_score, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [s.id, s.test_id, s.section_type, s.part_number, s.time_taken_seconds, s.score, s.max_score, s.notes, s.created_at]);
      }
      for (const q of questions) {
        db.run('INSERT INTO questions (id, section_id, question_number, question_type, my_answer, correct_answer, is_correct, personal_note, word_count) VALUES (?,?,?,?,?,?,?,?,?)',
          [q.id, q.section_id, q.question_number, q.question_type, q.my_answer, q.correct_answer, q.is_correct, q.personal_note, q.word_count||0]);
      }
      db.save();
      res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

// ─── Start Server ─────────────────────────────────────────────────────────

function startServer() {
  registerRoutes();
  app.listen(PORT, () => {
    console.log(`\n🎯 IELTS Prep is running at http://localhost:${PORT}\n`);
  });
}
