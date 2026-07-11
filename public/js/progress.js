// Progress & Analytics

let progressChart = null;
let avgChart = null;
let allTests = [];

async function loadProgress() {
  try {
    const [progress, tests] = await Promise.all([
      api.get('/api/analytics/progress'),
      api.get('/api/analytics/tests')
    ]);
    allTests = tests;
    renderProgressChart(progress.bySection);
    renderAvgChart(progress.bySection);
    renderQTypeAccuracy(progress.byQuestionType);
    renderTestsTable(tests);
  } catch(e) {
    Toast.error('Failed to load analytics');
  }
}

// ─── Progress Line Chart ──────────────────────────────────────────────────

function renderProgressChart(bySectionData) {
  const sections = ['Listening','Reading','Writing','Speaking'];
  const colors = {
    Listening: '#0284c7',
    Reading:   '#059669',
    Writing:   '#d97706',
    Speaking:  '#7c3aed'
  };

  const datasets = sections.map(sec => {
    const points = bySectionData
      .filter(d => d.section_type === sec && d.max_score > 0)
      .map(d => ({ x: d.date, y: d.pct }));
    return {
      label: sec,
      data: points,
      borderColor: colors[sec],
      backgroundColor: colors[sec] + '11',
      tension: 0.25,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    };
  });

  const ctx = document.getElementById('chart-progress').getContext('2d');
  if (progressChart) progressChart.destroy();

  progressChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: { xAxisKey: 'x', yAxisKey: 'y' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#475569', usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          ticks: { color: '#64748b' },
          grid: { color: '#f1f5f9' }
        },
        y: {
          min: 0, max: 100,
          ticks: { color: '#64748b', callback: v => v + '%' },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

// ─── Average Bar Chart ────────────────────────────────────────────────────

function renderAvgChart(bySectionData) {
  const sections = ['Listening','Reading','Writing','Speaking'];
  const colors = ['#0284c7','#059669','#d97706','#7c3aed'];

  const avgs = sections.map(sec => {
    const pts = bySectionData.filter(d => d.section_type === sec && d.max_score > 0);
    if (!pts.length) return 0;
    return Math.round(pts.reduce((s, d) => s + d.pct, 0) / pts.length);
  });

  const ctx = document.getElementById('chart-avg').getContext('2d');
  if (avgChart) avgChart.destroy();

  avgChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sections,
      datasets: [{
        data: avgs,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { display: false } },
        y: {
          min: 0, max: 100,
          ticks: { color: '#64748b', callback: v => v + '%' },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

// ─── Question Type Accuracy ───────────────────────────────────────────────

function renderQTypeAccuracy(qtypes) {
  const list = document.getElementById('qtype-list');
  const empty = document.getElementById('qtype-empty');
  list.innerHTML = '';

  if (!qtypes.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  qtypes.slice(0, 10).forEach(qt => {
    const pct = qt.total > 0 ? Math.round((qt.correct / qt.total) * 100) : 0;
    const color = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:var(--text-primary);">${escapeHtml(qt.question_type)}</span>
        <span style="font-size:12px;font-weight:700;color:${color};">${pct}% (${qt.correct}/${qt.total})</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    `;
    list.appendChild(div);
  });
}

// ─── Tests Table ──────────────────────────────────────────────────────────

function renderTestsTable(tests) {
  const tbody = document.getElementById('tests-table-body');
  const empty = document.getElementById('tests-table-empty');
  tbody.innerHTML = '';

  const filtered = tests.filter(t => {
    const mode = document.getElementById('filter-mode').value;
    return !mode || t.mode === mode;
  });

  if (!filtered.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  filtered.forEach(test => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(test.book_name)}</td>
      <td style="font-weight:600;">Test ${escapeHtml(test.test_number)}</td>
      <td>${formatDate(test.date)}</td>
      <td><span class="badge ${test.mode === 'mock' ? 'badge-purple' : 'badge-blue'}">${test.mode === 'mock' ? 'Mock' : 'Practice'}</span></td>
      <td id="trow-${test.id}-L" style="color:var(--listening-color);">—</td>
      <td id="trow-${test.id}-R" style="color:var(--reading-color);">—</td>
      <td id="trow-${test.id}-W" style="color:var(--writing-color);">—</td>
      <td id="trow-${test.id}-S" style="color:var(--speaking-color);">—</td>
      <td>${test.total_score !== null ? `<span class="score-pill">${test.total_score}</span>` : '—'}</td>
      <td><a href="/session.html?testId=${test.id}" class="btn btn-ghost btn-sm">Open</a></td>
    `;
    tbody.appendChild(tr);
  });

  // Load section scores per test
  filtered.forEach(async (test) => {
    try {
      const sections = await api.get(`/api/tests/${test.id}/sections`);
      const map = { Listening: 'L', Reading: 'R', Writing: 'W', Speaking: 'S' };
      const grouped = {};
      sections.forEach(s => {
        if (!grouped[s.section_type]) grouped[s.section_type] = { score: 0, max: 0 };
        grouped[s.section_type].score += s.score;
        grouped[s.section_type].max += s.max_score;
      });
      Object.entries(grouped).forEach(([type, data]) => {
        const el = document.getElementById(`trow-${test.id}-${map[type]}`);
        if (el) {
          const pct = data.max > 0 ? Math.round(data.score * 100 / data.max) : 0;
          el.textContent = `${data.score}/${data.max} (${pct}%)`;
        }
      });
    } catch(e) {}
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

document.getElementById('filter-mode').addEventListener('change', () => renderTestsTable(allTests));

loadProgress();
