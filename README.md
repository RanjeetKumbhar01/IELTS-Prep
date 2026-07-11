# 🎯 IELTS Prep

A locally-hosted, full-stack **IELTS Academic** preparation notebook web app.

Open your PDF book on one side, this app on the other — note down your answers, correct answers, scores, and observations for every section of every test. Track your progress over time with charts and analytics.

---

## ✨ Features

- 📚 **Book & Test Organization** — Books → Tests → Sections hierarchy
- 🎧 **Listening** — 4 Parts, per-part question type, variable question count
- 📖 **Reading** — 3 Passages, 14 IELTS question types, adjustable count
- ✍️ **Writing** — Task 1 & 2 with word count tracker and band score
- 🗣️ **Speaking** — Part 1/2/3 with cue card, notes, and feedback
- ⏱️ **Live Timer** — Section-level elapsed timer
- 📊 **Progress Analytics** — Score trends, section averages, question-type accuracy
- 🌙 **Dark / Light Mode** — Persistent theme toggle
- 💾 **JSON Backup / Restore** — Export and import all data
- ✏️ **Edit & Delete** — Books, tests, question rows

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML + Vanilla CSS + Vanilla JS |
| Backend | Node.js + Express |
| Database | SQLite via [sql.js](https://github.com/sql-js/sql.js) (pure JS, no native build) |
| Charts | Chart.js |
| Font | Plus Jakarta Sans |

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+

### Setup

```bash
git clone https://github.com/RanjeetKumbhar01/IELTS-Prep.git
cd IELTS-Prep
npm install
node server.js
```

Then open **http://localhost:3000** in your browser.

> Your data is stored in `ielts_prep.db` (SQLite file) in the project root. Back up this file or use **Settings → Export JSON** to save your progress.

---

## 📁 Project Structure

```
IELTS-Prep/
├── server.js          # Express API server
├── database.js        # sql.js SQLite setup & schema
├── package.json
└── public/
    ├── index.html     # Dashboard
    ├── book.html      # Book view (all tests)
    ├── session.html   # Test session (main notebook)
    ├── progress.html  # Analytics & charts
    ├── settings.html  # Settings, backup/restore
    ├── css/
    │   └── style.css  # Full design system
    └── js/
        ├── app.js     # Shared utilities, API, theme
        ├── dashboard.js
        ├── book.js
        ├── session.js
        └── progress.js
```

---

## 🗺️ IELTS Academic Format Covered

| Section | Structure | Questions |
|---|---|---|
| Listening | 4 Parts | 40 total |
| Reading | 3 Passages | 40 total |
| Writing | 2 Tasks | Task 1 ≥150w, Task 2 ≥250w |
| Speaking | 3 Parts | 11–14 min |

---

## 📄 License

Personal use project.
