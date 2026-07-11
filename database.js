const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, 'ielts_prep.db');
const isPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

async function getDb() {
  if (isPostgres) {
    console.log('⚡ Using Postgres Database');
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Create Postgres tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS tests (
        id          SERIAL PRIMARY KEY,
        book_id     INTEGER NOT NULL,
        test_number TEXT NOT NULL,
        mode        TEXT NOT NULL DEFAULT 'practice',
        date        TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM-DD'),
        total_score REAL,
        notes       TEXT DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS sections (
        id                  SERIAL PRIMARY KEY,
        test_id             INTEGER NOT NULL,
        section_type        TEXT NOT NULL,
        part_number         INTEGER DEFAULT 1,
        time_taken_seconds  INTEGER DEFAULT 0,
        score               REAL DEFAULT 0,
        max_score           REAL DEFAULT 0,
        notes               TEXT DEFAULT '',
        created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS questions (
        id              SERIAL PRIMARY KEY,
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

    // Helper to convert SQLite ? queries to Postgres $1, $2 queries
    function translateSql(sql) {
      let index = 1;
      return sql.replace(/\?/g, () => `$${index++}`);
    }

    async function all(sql, params = []) {
      const translated = translateSql(sql);
      const res = await pool.query(translated, params);
      return res.rows;
    }

    async function get(sql, params = []) {
      const rows = await all(sql, params);
      return rows[0] || null;
    }

    async function run(sql, params = []) {
      let translated = translateSql(sql);
      if (translated.trim().toUpperCase().startsWith('INSERT ')) {
        translated += ' RETURNING id';
      }
      const res = await pool.query(translated, params);
      const rowid = res.rows[0] ? res.rows[0].id : null;
      return { lastInsertRowid: rowid };
    }

    return { all, get, run, save: () => {}, _db: pool };

  } else {
    console.log('💾 Using Local sql.js SQLite Database');
    const initSqlJs = require('sql.js');
    const sqlJsLib = await initSqlJs();

    let fileBuffer = null;
    if (fs.existsSync(DB_PATH)) {
      fileBuffer = fs.readFileSync(DB_PATH);
    }

    const db = fileBuffer ? new sqlJsLib.Database(fileBuffer) : new sqlJsLib.Database();

    // Create SQLite schema
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

    function save() {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    }

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

    return { all, get, run, save, _db: db };
  }
}

module.exports = getDb();
