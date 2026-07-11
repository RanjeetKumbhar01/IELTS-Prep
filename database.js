const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'ielts_prep.db');

// We export a promise that resolves to { db, save }
// The server requires this as: const { db, save } = await require('./database');

let dbInstance = null;
let sqlJsLib   = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  sqlJsLib = await initSqlJs();

  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }

  const db = fileBuffer ? new sqlJsLib.Database(fileBuffer) : new sqlJsLib.Database();

  // ── Schema ─────────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id     INTEGER NOT NULL,
      test_number TEXT NOT NULL,
      mode        TEXT NOT NULL DEFAULT 'practice',
      date        TEXT NOT NULL DEFAULT (date('now','localtime')),
      total_score REAL,
      notes       TEXT DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id             INTEGER NOT NULL,
      section_type        TEXT NOT NULL,
      part_number         INTEGER DEFAULT 1,
      time_taken_seconds  INTEGER DEFAULT 0,
      score               REAL DEFAULT 0,
      max_score           REAL DEFAULT 0,
      notes               TEXT DEFAULT '',
      created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id      INTEGER NOT NULL,
      question_number INTEGER NOT NULL,
      question_type   TEXT DEFAULT '',
      my_answer       TEXT DEFAULT '',
      correct_answer  TEXT DEFAULT '',
      is_correct      INTEGER DEFAULT NULL,
      personal_note   TEXT DEFAULT '',
      word_count      INTEGER DEFAULT 0
    );
  `);

  // Helper to persist DB to disk after mutations
  function save() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  // ── Query helpers that mirror better-sqlite3's API ────────────────────

  function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  function get(sql, params = []) {
    const rows = all(sql, params);
    return rows[0] || null;
  }

  function run(sql, params = []) {
    db.run(sql, params);
    const lastId = db.exec('SELECT last_insert_rowid() AS id')[0];
    const rowid = lastId ? lastId.values[0][0] : null;
    save();
    return { lastInsertRowid: rowid };
  }

  dbInstance = { all, get, run, save, _db: db };
  return dbInstance;
}

module.exports = getDb();
