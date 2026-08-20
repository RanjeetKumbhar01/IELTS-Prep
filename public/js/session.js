// ─── Session Page — Core Notebook Logic ──────────────────────────────────

const params  = getParams();
const TEST_ID = params.testId;
let currentTest = null;
let currentBook = null;
let currentSection = null;

// Timer
let timerInterval = null;
let timerSeconds  = 0;
let timerRunning  = false;
let activeReadingPassage = null;
let targetAlertedFor = null;

// Auto-save
let autoSaveInterval = null;
const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Timer ───────────────────────────────────────────────────────────────

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); }, 1000);
  document.getElementById('btn-timer-start').classList.add('hidden');
  document.getElementById('btn-timer-stop').classList.remove('hidden');
  document.getElementById('timer-display').classList.add('timer-running');
}
function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  const startBtn = document.getElementById('btn-timer-start');
  if (startBtn) {
    startBtn.classList.remove('hidden');
    startBtn.textContent = timerSeconds > 0 ? 'Resume' : 'Start';
  }
  document.getElementById('btn-timer-stop').classList.add('hidden');
  document.getElementById('timer-display').classList.remove('timer-running');
}
function resetTimer() { 
  stopTimer(); 
  timerSeconds = 0; 
  targetAlertedFor = null; 
  updateTimerDisplay(); 
  const startBtn = document.getElementById('btn-timer-start');
  if (startBtn) startBtn.textContent = 'Start';
}
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  display.textContent = formatTime(timerSeconds);
  // Accept the dedicated target field, while treating the existing Time field as a
  // target too when no target has been set. This keeps the alert intuitive for
  // sessions created before the dedicated target field existed.
  const targetMinutes = activeReadingPassage
    ? Number(document.getElementById(`read-p${activeReadingPassage}-target`)?.value || document.getElementById(`read-p${activeReadingPassage}-time`)?.value || 0)
    : 0;
  const targetSeconds = targetMinutes * 60;
  const reachedTarget = targetSeconds > 0 && timerSeconds >= targetSeconds;
  display.classList.toggle('over-target', reachedTarget);
  document.getElementById('timer-target-wrap').classList.toggle('over-target', reachedTarget);
  if (reachedTarget && targetAlertedFor !== activeReadingPassage) {
    targetAlertedFor = activeReadingPassage;
    display.classList.add('timer-alert');
    setTimeout(() => display.classList.remove('timer-alert'), 3200);
  }
}

function setActiveReadingPassage(passageNum) {
  activeReadingPassage = passageNum;
  targetAlertedFor = null;
  const target = document.getElementById(`read-p${passageNum}-target`)?.value || document.getElementById(`read-p${passageNum}-time`)?.value || '';
  document.getElementById('timer-target').textContent = target ? `${target} min` : 'Not set';
  document.getElementById('timer-target-wrap').classList.remove('hidden');
  updateTimerDisplay();
}

// ─── Auto-save ────────────────────────────────────────────────────────────

function startAutoSave() {
  if (autoSaveInterval) return;
  autoSaveInterval = setInterval(() => {
    saveAllSections();
  }, AUTO_SAVE_INTERVAL_MS);
  console.log('Auto-save started (every 5 minutes)');
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log('Auto-save stopped');
  }
}

async function saveAllSections() {
  if (!TEST_ID) return;
  try {
    const promises = [
      ...IELTS.LISTENING_PARTS.map(p => saveSectionPart('Listening', p.num)),
      ...IELTS.READING_PASSAGES.map(p => saveSectionPart('Reading', p.num)),
      ...IELTS.WRITING_TASKS.map(t => saveWritingTask(t.num)),
      ...IELTS.SPEAKING_PARTS.map(p => saveSpeakingPart(p.num))
    ];
    await Promise.all(promises);
    console.log('Auto-save completed at', new Date().toLocaleTimeString());
    // Optional: Show a subtle notification
    showAutoSaveNotification();
  } catch(e) {
    console.error('Auto-save failed:', e);
  }
}

function showAutoSaveNotification() {
  // Create or update a subtle auto-save indicator
  let indicator = document.getElementById('auto-save-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'auto-save-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--success, #10b981);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s, transform 0.3s;
      z-index: 1000;
    `;
    document.body.appendChild(indicator);
  }
  indicator.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
  indicator.style.opacity = '1';
  indicator.style.transform = 'translateY(0)';
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(20px)';
  }, 3000);
}

document.getElementById('btn-timer-start').addEventListener('click', startTimer);
document.getElementById('btn-timer-stop').addEventListener('click', stopTimer);
document.getElementById('btn-timer-reset').addEventListener('click', resetTimer);

// ─── Section Switch ───────────────────────────────────────────────────────

function switchSection(sectionName) {
  currentSection = sectionName;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-section="${sectionName}"]`).classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${sectionName}`).classList.add('active');
  const limits = { Listening: '30 min', Reading: '60 min', Writing: '60 min', Speaking: '14 min' };
  document.getElementById('timer-section-info').textContent = sectionName;
  document.getElementById('timer-limit').textContent = `Limit: ${limits[sectionName]}`;
  activeReadingPassage = null;
  document.getElementById('timer-target-wrap').classList.toggle('hidden', sectionName !== 'Reading');
  if (sectionName === 'Reading') setActiveReadingPassage(1);
  resetTimer();
}

// Bind click events to tab buttons to allow switching sections
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.dataset.section;
    if (sec) switchSection(sec);
  });
});

// ─── Correct Toggle ───────────────────────────────────────────────────────

function cycleCorrect(btn) {
  const states = ['', '1', '0'];
  const icons  = { '': '·', '1': '✓', '0': '✗' };
  const next = states[(states.indexOf(btn.dataset.val) + 1) % states.length];
  btn.dataset.val = next;
  btn.textContent = icons[next];
  updateTally();
}

function buildCorrectToggle(val) {
  const icons = { '1': '✓', '0': '✗', '': '·' };
  const v = val === null || val === undefined ? '' : String(val);
  return `<button class="correct-toggle" data-val="${v}" onclick="cycleCorrect(this)">${icons[v] || '·'}</button>`;
}

function updateTally() {
  ['Listening', 'Reading'].forEach(sec => {
    const panel = document.getElementById(`panel-${sec}`);
    if (!panel) return;
    const all     = panel.querySelectorAll('.correct-toggle');
    const correct = [...all].filter(b => b.dataset.val === '1').length;
    const answered = [...all].filter(b => b.dataset.val !== '').length;
    const el = document.getElementById(`${sec.toLowerCase()}-tally`);
    if (el) el.textContent = `${correct} correct / ${all.length} total (${answered} answered)`;
  });

  const reading = document.getElementById('panel-Reading');
  if (!reading) return;
  const all = reading.querySelectorAll('.correct-toggle');
  const correct = [...all].filter(b => b.dataset.val === '1').length;
  const marked = [...all].filter(b => b.dataset.val !== '').length;
  const header = document.getElementById('reading-header-tally');
  const detail = document.getElementById('reading-header-detail');
  if (header) header.textContent = `${correct} / ${all.length}`;
  if (detail) detail.textContent = `${marked} marked · ${all.length - marked} to check`;

  updateQuestionScoreboard('Listening');
  updateQuestionScoreboard('Reading');
  updateBandScoreboard('Writing', IELTS.WRITING_TASKS.map(task => `write-t${task.num}-score`));
  updateBandScoreboard('Speaking', IELTS.SPEAKING_PARTS.map(part => `speak-p${part.num}-score`));

  IELTS.READING_PASSAGES.forEach(passage => {
    const partId = `read-p${passage.num}`;
    const rows = document.querySelectorAll(`#${partId}-body .q-row`);
    const partCorrect = [...rows].filter(row => row.querySelector('.correct-toggle')?.dataset.val === '1').length;
    const badge = document.getElementById(`${partId}-badge`);
    const scoreInput = document.getElementById(`${partId}-score-inp`);
    const maxInput = document.getElementById(`${partId}-max`);
    if (badge) badge.textContent = `${partCorrect}/${rows.length}`;
    if (scoreInput) scoreInput.value = partCorrect;
    if (maxInput) maxInput.value = rows.length;
  });

  IELTS.LISTENING_PARTS.forEach(part => {
    const partId = `listen-p${part.num}`;
    const rows = document.querySelectorAll(`#${partId}-body .q-row`);
    const partCorrect = [...rows].filter(row => row.querySelector('.correct-toggle')?.dataset.val === '1').length;
    const badge = document.getElementById(`${partId}-badge`);
    const scoreInput = document.getElementById(`${partId}-score-inp`);
    const maxInput = document.getElementById(`${partId}-max`);
    if (badge) badge.textContent = `${partCorrect}/${rows.length}`;
    if (scoreInput) scoreInput.value = partCorrect;
    if (maxInput) maxInput.value = rows.length;
  });
}

function updateQuestionScoreboard(sectionType) {
  const panel = document.getElementById(`panel-${sectionType}`);
  const all = panel?.querySelectorAll('.correct-toggle') || [];
  const correct = [...all].filter(button => button.dataset.val === '1').length;
  const marked = [...all].filter(button => button.dataset.val !== '').length;
  const header = document.getElementById(`${sectionType.toLowerCase()}-header-tally`);
  const detail = document.getElementById(`${sectionType.toLowerCase()}-header-detail`);
  if (header) {
    let bandText = '';
    if (sectionType === 'Listening') {
      bandText = ` (Band ${calculateListeningBand(correct).toFixed(1)})`;
    } else if (sectionType === 'Reading') {
      bandText = ` (Band ${calculateReadingBand(correct).toFixed(1)})`;
    }
    header.textContent = `${correct} / ${all.length}${bandText}`;
  }
  if (detail) detail.textContent = `${marked} marked · ${all.length - marked} to check`;
}

function updateBandScoreboard(sectionType, scoreIds) {
  const values = scoreIds
    .map(id => document.getElementById(id)?.value)
    .filter(value => value !== undefined && value !== '')
    .map(Number)
    .filter(value => Number.isFinite(value) && value >= 0);
  const header = document.getElementById(`${sectionType.toLowerCase()}-header-tally`);
  const detail = document.getElementById(`${sectionType.toLowerCase()}-header-detail`);
  if (!header || !detail) return;
  header.textContent = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '—';
  detail.textContent = values.length ? `${values.length} of ${scoreIds.length} scores entered` : `Add ${sectionType === 'Writing' ? 'Task' : 'part'} bands`;
}

function updateQuestionNumbers(sectionType) {
  const parts = sectionType === 'Reading' ? IELTS.READING_PASSAGES : IELTS.LISTENING_PARTS;
  const prefix = sectionType === 'Reading' ? 'read-p' : 'listen-p';
  let offset = 0;
  parts.forEach(part => {
    const tbody = document.getElementById(`${prefix}${part.num}-body`);
    if (!tbody) return;
    tbody.querySelectorAll('tr.q-row').forEach((row, index) => {
      row.dataset.qnum = index + 1;
      const numCell = row.querySelector('.q-num');
      if (numCell) numCell.textContent = offset + index + 1;
    });
    offset += tbody.querySelectorAll('tr.q-row').length;
  });
}

function updateReadingQuestionNumbers() { updateQuestionNumbers('Reading'); }
function updateListeningQuestionNumbers() { updateQuestionNumbers('Listening'); }

// ─── Question Row Builder ────────────────────────────────────────────────

function buildQuestionRow(num, q = {}) {
  const v = q.is_correct === null || q.is_correct === undefined ? '' : String(q.is_correct);
  const icons = { '': '·', '1': '✓', '0': '✗' };
  return `
    <tr class="q-row" data-qnum="${num}" data-qtype="">
      <td class="q-num">${num}</td>
      <td><input type="text" class="q-answer-input" value="${escapeHtml(q.my_answer || '')}" placeholder="Your answer" /></td>
      <td><button class="correct-toggle" data-val="${v}" onclick="cycleCorrect(this)">${icons[v] || '·'}</button></td>
      <td><button class="btn-del-row" onclick="deleteQuestionRow(this)">✕</button></td>
    </tr>`;
}

function buildQuestionRows(existingQs, defaultCount) {
  const count = Math.max(existingQs.length, defaultCount);
  let html = '';
  for (let i = 1; i <= count; i++) {
    const q = existingQs.find(x => x.question_number === i) || {};
    html += buildQuestionRow(i, q);
  }
  return html;
}

// ─── Delete & Add Rows ────────────────────────────────────────────────────

function deleteQuestionRow(btn) {
  const row = btn.closest('tr.q-row');
  if (!row) return;
  const tbody = row.closest('tbody');
  row.remove();
  // Renumber remaining rows
  if (tbody) {
    tbody.querySelectorAll('tr.q-row').forEach((r, i) => {
      r.dataset.qnum = i + 1;
      const numCell = r.querySelector('.q-num');
      if (numCell) numCell.textContent = i + 1;
    });
  }
  updateTally();
  if (tbody?.id.startsWith('read-p')) updateReadingQuestionNumbers();
  if (tbody?.id.startsWith('listen-p')) updateListeningQuestionNumbers();
}

function addQuestionRow(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows   = tbody.querySelectorAll('tr.q-row');
  const nextNum = rows.length + 1;
  const tr = document.createElement('tr');
  tr.className = 'q-row';
  tr.dataset.qnum  = nextNum;
  tr.dataset.qtype = '';
  tr.innerHTML = `
    <td class="q-num">${nextNum}</td>
    <td><input type="text" class="q-answer-input" placeholder="Your answer" /></td>
    <td><button class="correct-toggle" data-val="" onclick="cycleCorrect(this)">·</button></td>
    <td><button class="btn-del-row" onclick="deleteQuestionRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  if (tbodyId.startsWith('read-p')) updateReadingQuestionNumbers();
  if (tbodyId.startsWith('listen-p')) updateListeningQuestionNumbers();
  updateTally();
}

// ─── Rebuild Rows When Count Changes ─────────────────────────────────────

function rebuildPartQuestions(partId) {
  const countInp = document.getElementById(`${partId}-qcount`);
  const count    = Math.max(1, parseInt(countInp?.value) || 10);
  const tbody    = document.getElementById(`${partId}-body`);
  if (!tbody) return;

  const existingRows = [...tbody.querySelectorAll('tr.q-row')];
  const currentCount = existingRows.length;

  if (count > currentCount) {
    for (let i = currentCount + 1; i <= count; i++) {
      const tr = document.createElement('tr');
      tr.className = 'q-row';
      tr.dataset.qnum  = i;
      tr.dataset.qtype = '';
      tr.innerHTML = `
        <td class="q-num">${i}</td>
        <td><input type="text" class="q-answer-input" placeholder="Your answer" /></td>
        <td><button class="correct-toggle" data-val="" onclick="cycleCorrect(this)">·</button></td>
        <td><button class="btn-del-row" onclick="deleteQuestionRow(this)">✕</button></td>
      `;
      tbody.appendChild(tr);
    }
  } else if (count < currentCount) {
    for (let i = currentCount; i > count; i--) {
      existingRows[i - 1].remove();
    }
  }

  const maxInp = document.getElementById(`${partId}-max`);
  if (maxInp) maxInp.placeholder = String(count);

  updateTally();
  if (partId.startsWith('read-p')) updateReadingQuestionNumbers();
  if (partId.startsWith('listen-p')) updateListeningQuestionNumbers();
}

// ─── Part Settings HTML ───────────────────────────────────────────────────

function buildPartSettingsHTML(partId, secData, qCount) {
  return `
    <div class="part-settings">
      <div class="form-group">
        <label>Questions</label>
        <input type="number" id="${partId}-qcount" min="1" max="50"
          value="${qCount}" style="width:70px;"
          onchange="rebuildPartQuestions('${partId}')" />
      </div>
      <div class="form-group">
        <label>Timer alert at (min)</label>
        <input type="number" id="${partId}-target" min="0" max="90"
          value="${secData?.target_time_seconds ? Math.round(secData.target_time_seconds / 60) : ''}" placeholder="e.g. 15" style="width:78px;"
          oninput="${partId.startsWith('read-p') ? `if (activeReadingPassage === ${partId.replace('read-p', '')}) setActiveReadingPassage(${partId.replace('read-p', '')})` : ''}" />
      </div>
      <div class="form-group">
        <label>Score</label>
        <input type="number" id="${partId}-score-inp" min="0"
          value="${secData ? secData.score : ''}" placeholder="0" step="0.5" style="width:70px;" />
      </div>
      <div class="form-group">
        <label>Max</label>
        <input type="number" id="${partId}-max" min="0"
          value="${secData ? secData.max_score : qCount}" placeholder="${qCount}" style="width:70px;" />
      </div>
    </div>`;
}

function buildQTable(partId, tbodyHtml) {
  return `
    <div class="q-table-wrap" style="overflow-x:auto;">
      <table class="question-table" id="${partId}-table">
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th>My Answer</th>
            <th style="width:40px;">Mark</th>
            <th style="width:30px;"></th>
          </tr>
        </thead>
        <tbody id="${partId}-body">${tbodyHtml}</tbody>
      </table>
    </div>
    <div class="flex gap-2 mt-2">
      <button class="btn btn-ghost btn-sm"
        onclick="addQuestionRow('${partId}-body')">
        Add Row
      </button>
    </div>`;
}

// ─── Listening Parts Builder ──────────────────────────────────────────────

function buildListeningParts(existingData) {
  const container = document.getElementById('listening-parts');
  container.innerHTML = '';

  const colors = ['#0284c7', '#a78bfa', '#059669', '#d97706'];

  IELTS.LISTENING_PARTS.forEach(part => {
    const secData  = existingData?.sections?.find(s => s.part_number === part.num);
    const qs       = existingData?.questions?.[secData?.id] || [];
    const qCount   = qs.length > 0 ? qs.length : 10;
    const partId   = `listen-p${part.num}`;

    const block = document.createElement('div');
    block.className = 'part-block';
    block.id        = `listen-part-${part.num}`;

    block.innerHTML = `
      <div class="part-header" onclick="togglePart(this.parentElement)">
        <div class="part-header-left">
          <div class="part-dot" style="background:${colors[part.num - 1]};"></div>
          <div>
            <div class="part-title">Part ${part.num}</div>
            <div class="part-subtitle">${part.context}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge badge-listening" id="${partId}-badge">
            ${secData ? secData.score + '/' + secData.max_score : '—'}
          </span>
          <span class="part-chevron">▾</span>
        </div>
      </div>
      <div class="part-body">
        ${buildPartSettingsHTML(partId, secData, qCount)}
        ${buildQTable(partId, buildQuestionRows(qs, qCount))}
        <div class="form-group mt-3">
          <label>Part ${part.num} Notes</label>
          <textarea id="${partId}-notes" rows="2"
            placeholder="Strategy, mistakes, vocabulary..."
          >${secData ? escapeHtml(secData.notes) : ''}</textarea>
        </div>
      </div>`;

    container.appendChild(block);
  });

  document.querySelector('#listen-part-1')?.classList.add('open');
  updateListeningQuestionNumbers();
}

// ─── Reading Passages Builder ─────────────────────────────────────────────

function buildReadingPassages(existingData) {
  const container = document.getElementById('reading-passages');
  container.innerHTML = '';

  const defaultCounts = [13, 14, 13];
  const colors = ['#059669', '#0284c7', '#7c3aed'];

  IELTS.READING_PASSAGES.forEach(passage => {
    const secData   = existingData?.sections?.find(s => s.part_number === passage.num);
    const qs        = existingData?.questions?.[secData?.id] || [];
    const qCount    = qs.length > 0 ? qs.length : defaultCounts[passage.num - 1];
    const partId    = `read-p${passage.num}`;

    const block = document.createElement('div');
    block.className = 'part-block';
    block.id        = `read-p${passage.num}`;

    block.innerHTML = `
      <div class="part-header" onclick="togglePart(this.parentElement)">
        <div class="part-header-left">
          <div class="part-dot" style="background:${colors[passage.num - 1]};"></div>
          <div>
            <div class="part-title">${passage.context}</div>
            <div class="part-subtitle">Default Q range: ${passage.qRange}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge badge-reading" id="${partId}-badge">
            ${secData ? secData.score + '/' + secData.max_score : '—'}
          </span>
          <span class="part-chevron">▾</span>
        </div>
      </div>
      <div class="part-body">
        ${buildPartSettingsHTML(partId, secData, qCount)}
        ${buildQTable(partId, buildQuestionRows(qs, qCount))}
        <div class="form-group mt-3">
          <label>Passage ${passage.num} Notes</label>
          <textarea id="${partId}-notes" rows="2"
            placeholder="Passage topics, details..."
          >${secData ? escapeHtml(secData.notes) : ''}</textarea>
        </div>
      </div>`;

    container.appendChild(block);
  });

  document.querySelector('#read-p1')?.classList.add('open');
  updateReadingQuestionNumbers();
  observeReadingPassages();
}

function observeReadingPassages() {
  const blocks = IELTS.READING_PASSAGES
    .map(passage => document.getElementById(`read-p${passage.num}`))
    .filter(Boolean);
  if (!blocks.length || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible && currentSection === 'Reading') setActiveReadingPassage(Number(visible.target.id.replace('read-p', '')));
  }, { threshold: 0.35 });
  blocks.forEach(block => observer.observe(block));
}

// ─── Writing Tasks Builder ────────────────────────────────────────────────────────────────

function buildWritingTasks(existingData) {
  const container = document.getElementById('writing-tasks');
  container.innerHTML = '';

  IELTS.WRITING_TASKS.forEach(task => {
    const secData       = existingData?.sections?.find(s => s.part_number === task.num);
    const qs            = existingData?.questions?.[secData?.id] || [];
    const myAnswer      = qs[0]?.my_answer || '';
    const correctAnswer = qs[0]?.correct_answer || '';
    const wordCnt       = countWords(myAnswer);
    const correctWC     = countWords(correctAnswer);

    const div = document.createElement('div');
    div.className = 'writing-task-wrap';

    const bandVal = secData ? secData.score : '';
    const targetVal = secData && secData.target_time_seconds ? Math.round(secData.target_time_seconds / 60) : '';
    const notesVal = secData ? escapeHtml(secData.notes) : '';
    const myAnswerHtml = escapeHtml(myAnswer);
    const correctAnswerHtml = escapeHtml(correctAnswer);
    const myWcClass = wordCnt >= task.minWords ? 'ok' : (wordCnt > 0 ? 'warn' : '');
    const correctWcClass = correctWC > 0 ? 'ok' : '';

    div.innerHTML =
      '<div class="writing-task-header">' +
        '<div class="writing-task-title">Task ' + task.num + '</div>' +
        '<div class="writing-task-hint">' + task.context + ' &middot; Min ' + task.minWords + ' words</div>' +
      '</div>' +
      '<div class="writing-task-meta">' +
        '<div class="form-group">' +
          '<label>Band Score</label>' +
          '<input type="number" id="write-t' + task.num + '-score" min="0" max="9" step="0.5" oninput="updateTally()" value="' + bandVal + '" placeholder="e.g. 6.5" style="width:90px;" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Timer alert (min)</label>' +
          '<input type="number" id="write-t' + task.num + '-target" min="0" max="90" value="' + targetVal + '" placeholder="e.g. 20" style="width:90px;" />' +
        '</div>' +
      '</div>' +
      '<div class="writing-layout">' +
        '<div class="writing-answer-block">' +
          '<div class="writing-answer-label">' +
            '<span>My Answer</span>' +
            '<span class="word-count-display ' + myWcClass + '" id="wc-t' + task.num + '">' + wordCnt + ' / ' + task.minWords + ' words</span>' +
          '</div>' +
          '<textarea class="writing-answer-textarea" id="write-t' + task.num + '-my" rows="9"' +
            ' placeholder="Type your response here..."' +
            ' oninput="updateWordCount(this,\'wc-t' + task.num + '\',' + task.minWords + ')"' +
          '>' + myAnswerHtml + '</textarea>' +
          '<div class="writing-answer-footer">' +
            '<div></div>' +
            '<button type="button" class="btn-analyze-text" id="btn-ai-eval-t' + task.num + '" onclick="triggerAiEvaluation(' + task.num + ',' + task.minWords + ')">' +
              'Analyze Text' +
            '</button>' +
          '</div>' +
          '<div id="write-t' + task.num + '-ai-container"></div>' +
        '</div>' +
        '<div class="writing-answer-block">' +
          '<div class="writing-answer-label">' +
            '<span>Model / Ideal Answer</span>' +
            '<span class="word-count-display ' + correctWcClass + '" id="wc-correct-t' + task.num + '">' + correctWC + ' words</span>' +
          '</div>' +
          '<textarea class="writing-answer-textarea" id="write-t' + task.num + '-correct" rows="6"' +
            ' placeholder="Paste model answer or desired answer here..."' +
            ' oninput="updateWordCountSimple(this,\'wc-correct-t' + task.num + '\')"' +
          '>' + correctAnswerHtml + '</textarea>' +
        '</div>' +
        '<div class="form-group" style="margin-top:8px;">' +
          '<label>Notes</label>' +
          '<textarea id="write-t' + task.num + '-notes" rows="2" placeholder="Personal strategies, observations...">' + notesVal + '</textarea>' +
        '</div>' +
      '</div>';

    container.appendChild(div);
  });
}

function updateWordCount(textarea, displayId, min) {
  const wc = countWords(textarea.value);
  const el = document.getElementById(displayId);
  if (!el) return;
  el.textContent = wc + ' / ' + min + ' words';
  el.className = 'word-count-display ' + (wc >= min ? 'ok' : (wc > 0 ? 'warn' : ''));
}

function updateWordCountSimple(textarea, displayId) {
  const wc = countWords(textarea.value);
  const el = document.getElementById(displayId);
  if (!el) return;
  el.textContent = wc + ' words';
  el.className = 'word-count-display ' + (wc > 0 ? 'ok' : '');
}

// ─── AI Evaluation Handlers for Writing Tasks ─────────────────────────────

async function triggerAiEvaluation(taskNum, minWords) {
  const textInput = document.getElementById(`write-t${taskNum}-my`);
  const correctNotes = document.getElementById(`write-t${taskNum}-correct`)?.value || '';
  const text = textInput ? textInput.value.trim() : '';
  const container = document.getElementById(`write-t${taskNum}-ai-container`);
  const evalBtn = document.getElementById(`btn-ai-eval-t${taskNum}`);

  const words = countWords(text);
  if (words < 10) {
    Toast.error(`Please write at least 10 words in Task ${taskNum} before analyzing.`);
    textInput?.focus();
    return;
  }

  if (evalBtn) evalBtn.disabled = true;
  if (container) {
    container.innerHTML = `
      <div class="ai-loading-state">
        <div class="ai-spinner"></div>
        <div>
          <strong style="color:var(--text-primary);display:block;margin-bottom:2px;">Analyzing Task ${taskNum}...</strong>
          <span style="font-size:11.5px;color:var(--text-muted);">Checking grammar, vocabulary, spelling, and IELTS band criteria...</span>
        </div>
      </div>
    `;
  }

  try {
    const res = await IELTS_AI.evaluateWriting({
      text,
      taskNumber: taskNum,
      modelNotes: correctNotes
    });

    if (!res || !res.success || !res.evaluation) {
      throw new Error(res?.error || 'AI analysis failed to return structured data');
    }

    renderAiEvaluationResult(taskNum, res.evaluation, res.model_used);
    Toast.success(`Task ${taskNum} analyzed. Estimated Band: ${res.evaluation.overall_band ?? '—'}`);
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="ai-eval-panel" style="border-left-color:var(--danger);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-weight:700;color:var(--danger);font-size:13px;">Analysis Failed</div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('write-t${taskNum}-ai-container').innerHTML=''" style="padding:2px 8px;font-size:11px;">Dismiss</button>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">${escapeHtml(err.message)}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-primary btn-sm" onclick="triggerAiEvaluation(${taskNum}, ${minWords})">Retry</button>
            <a href="/settings.html" class="btn btn-secondary btn-sm" style="text-decoration:none;">Open Settings</a>
          </div>
        </div>
      `;
    }
    Toast.error(`Analysis failed: ${err.message}`);
  } finally {
    if (evalBtn) evalBtn.disabled = false;
  }
}

function applyAiBandScore(taskNum, score) {
  const scoreInput = document.getElementById(`write-t${taskNum}-score`);
  if (scoreInput) {
    scoreInput.value = score;
    updateTally();
    Toast.success(`Applied Band ${score} to Task ${taskNum}`);
  }
}

function renderAiEvaluationResult(taskNum, ev, modelUsed) {
  const container = document.getElementById(`write-t${taskNum}-ai-container`);
  if (!container) return;

  const band = ev.overall_band !== undefined ? ev.overall_band : '—';
  const bd = ev.band_breakdown || {};
  const grammar = Array.isArray(ev.grammar_mistakes) ? ev.grammar_mistakes : [];
  const paraphrase = Array.isArray(ev.paraphrase_mistakes) ? ev.paraphrase_mistakes : [];
  const spelling = Array.isArray(ev.spelling_mistakes) ? ev.spelling_mistakes : [];

  let html = `
    <div class="ai-eval-panel">
      <!-- Top header -->
      <div class="ai-eval-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:700;font-size:13.5px;color:var(--text-primary);">Writing Analysis & Diagnostic Report</span>
          <span class="badge badge-writing" style="font-size:10.5px;">${escapeHtml(modelUsed || 'Gemini 3.5 Flash')}</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('write-t${taskNum}-ai-container').innerHTML=''" style="padding:2px 8px;font-size:11px;" title="Dismiss review">Close</button>
      </div>

      <!-- Band Score Banner -->
      <div class="ai-band-banner">
        <div class="ai-band-score-box">
          <span style="font-size:12px;color:var(--text-muted);font-weight:600;">Approx. Band</span>
          <span class="ai-band-number">${band}</span>
          ${band !== '—' ? `
            <button class="btn btn-primary btn-sm" onclick="applyAiBandScore(${taskNum}, ${band})" style="margin-left:8px;padding:3px 8px;font-size:11px;">
              Apply Score
            </button>
          ` : ''}
        </div>
        <div class="ai-criteria-grid">
          <div class="ai-criteria-pill">
            <span class="ai-criteria-label">${taskNum === 1 ? 'Task Ach.' : 'Task Resp.'}</span>
            <span class="ai-criteria-val">${bd.task_achievement ?? '—'}</span>
          </div>
          <div class="ai-criteria-pill">
            <span class="ai-criteria-label">Coh. &amp; Cohesion</span>
            <span class="ai-criteria-val">${bd.coherence_cohesion ?? '—'}</span>
          </div>
          <div class="ai-criteria-pill">
            <span class="ai-criteria-label">Lexical Resource</span>
            <span class="ai-criteria-val">${bd.lexical_resource ?? '—'}</span>
          </div>
          <div class="ai-criteria-pill">
            <span class="ai-criteria-label">Grammar Acc.</span>
            <span class="ai-criteria-val">${bd.grammatical_accuracy ?? '—'}</span>
          </div>
        </div>
      </div>

      <!-- Summary -->
      ${ev.summary ? `
        <div class="ai-eval-summary">
          <strong>Examiner Assessment:</strong> ${escapeHtml(ev.summary)}
        </div>
      ` : ''}

      <!-- 1. Grammar Mistakes -->
      <div class="ai-category-title">
        <span>Grammar Mistakes</span>
        <span class="ai-count-badge badge-grammar">${grammar.length}</span>
      </div>
      ${grammar.length === 0 ? `
        <div class="ai-empty-mistakes">No grammatical errors detected.</div>
      ` : `
        <div class="ai-mistake-list">
          ${grammar.map(g => `
            <div class="ai-mistake-card">
              ${g.snippet ? `<div class="ai-mistake-snippet">"${escapeHtml(g.snippet)}"</div>` : ''}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
                ${g.error_type ? `<span class="badge badge-grammar" style="font-size:10px;">${escapeHtml(g.error_type)}</span>` : ''}
              </div>
              <div style="color:var(--text-secondary);font-size:11.5px;line-height:1.4;">${escapeHtml(g.explanation || '')}</div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- 2. Paraphrasing & Phrasing Mistakes -->
      <div class="ai-category-title">
        <span>Word Choice &amp; Paraphrasing</span>
        <span class="ai-count-badge badge-paraphrase">${paraphrase.length}</span>
      </div>
      ${paraphrase.length === 0 ? `
        <div class="ai-empty-mistakes">No unnatural phrasing or awkward collocations detected.</div>
      ` : `
        <div class="ai-mistake-list">
          ${paraphrase.map(p => `
            <div class="ai-mistake-card">
              ${p.snippet ? `<div class="ai-mistake-snippet">"${escapeHtml(p.snippet)}"</div>` : ''}
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
                ${p.issue ? `<span class="badge badge-paraphrase" style="font-size:10px;">${escapeHtml(p.issue)}</span>` : ''}
              </div>
              <div style="color:var(--text-secondary);font-size:11.5px;line-height:1.4;">${escapeHtml(p.suggestion || '')}</div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- 3. Spelling & Typo Mistakes -->
      <div class="ai-category-title">
        <span>Spelling &amp; Typos</span>
        <span class="ai-count-badge badge-spelling">${spelling.length}</span>
      </div>
      ${spelling.length === 0 ? `
        <div class="ai-empty-mistakes">No spelling mistakes or typos found.</div>
      ` : `
        <div class="ai-mistake-list">
          ${spelling.map(s => `
            <div class="ai-mistake-card">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;">
                <span class="ai-mistake-snippet" style="margin-bottom:0;">${escapeHtml(s.word || '')}</span>
                <span style="font-size:11.5px;font-weight:700;color:var(--success);">→ ${escapeHtml(s.correction || '')}</span>
              </div>
              ${s.explanation ? `<div style="color:var(--text-secondary);font-size:11.5px;margin-top:2px;">${escapeHtml(s.explanation)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `}

      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;">
        <span style="font-size:11px;color:var(--text-muted);">Diagnostic error feedback only · No sample essay generated</span>
        <button class="btn btn-secondary btn-sm" onclick="triggerAiEvaluation(${taskNum}, ${taskNum === 1 ? 150 : 250})" style="font-size:11px;">Re-analyze Text</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ─── Speaking Parts Builder ───────────────────────────────────────────────

function buildSpeakingParts(existingData) {
  const container = document.getElementById('speaking-parts');
  container.innerHTML = '';

  IELTS.SPEAKING_PARTS.forEach(part => {
    const secData  = existingData?.sections?.find(s => s.part_number === part.num);
    const qs       = existingData?.questions?.[secData?.id] || [];
    const topic    = qs[0]?.my_answer || '';
    const myNotes  = qs[0]?.personal_note || '';
    const feedback = qs[0]?.correct_answer || '';

    const div = document.createElement('div');
    div.className = 'speaking-part-wrap';
    div.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Part ${part.num}</div>
          <div style="font-size:11.5px;color:var(--text-secondary);">${part.context}</div>
        </div>
        <div class="flex gap-2 items-center" style="flex-wrap:wrap;">
          <label style="text-transform:none;font-size:11.5px;margin:0;color:var(--text-muted);">Band:</label>
          <input type="number" id="speak-p${part.num}-score" min="0" max="9" step="0.5" oninput="updateTally()"
            value="${secData ? secData.score : ''}" placeholder="—"
            style="width:50px;text-align:center;" />
          <label style="text-transform:none;font-size:11.5px;margin:0;color:var(--text-muted);">Timer alert (min):</label>
          <input type="number" id="speak-p${part.num}-target" min="0" max="20"
            value="${secData?.target_time_seconds ? Math.round(secData.target_time_seconds / 60) : ''}" placeholder="—"
            style="width:50px;text-align:center;" />
        </div>
      </div>
      ${part.num === 2 ? `
        <div class="cue-card-box">
          <div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:6px;">Cue Card Topic</div>
          <textarea id="speak-p${part.num}-topic" rows="3"
            placeholder="Cue card prompt details...">${escapeHtml(topic)}</textarea>
        </div>
      ` : `
        <div class="form-group">
          <label>Topic / Questions Asked</label>
          <textarea id="speak-p${part.num}-topic" rows="2"
            placeholder="Questions or topics...">${escapeHtml(topic)}</textarea>
        </div>
      `}
      <div class="form-group">
        <label>My Answer Notes</label>
        <textarea id="speak-p${part.num}-mynotes" rows="3"
          placeholder="Points spoken, outlines...">${escapeHtml(myNotes)}</textarea>
      </div>
      <div class="form-group">
        <label>Feedback &amp; Corrections</label>
        <textarea id="speak-p${part.num}-feedback" rows="2"
          placeholder="Grammar, vocabulary improvements...">${escapeHtml(feedback)}</textarea>
      </div>
      <div class="form-group">
        <label>General Notes</label>
        <textarea id="speak-p${part.num}-notes" rows="2"
          placeholder="General strategy notes...">${secData ? escapeHtml(secData.notes) : ''}</textarea>
      </div>`;
    container.appendChild(div);
  });
}

// ─── Accordion Toggle ─────────────────────────────────────────────────────

function togglePart(block) { block.classList.toggle('open'); }

// ─── Save Section ─────────────────────────────────────────────────────────

async function saveSection(sectionType) {
  if (!TEST_ID) return;
  try {
    let promises = [];
    if      (sectionType === 'Listening') promises = IELTS.LISTENING_PARTS.map(p => saveSectionPart('Listening', p.num));
    else if (sectionType === 'Reading')   promises = IELTS.READING_PASSAGES.map(p => saveSectionPart('Reading', p.num));
    else if (sectionType === 'Writing')   promises = IELTS.WRITING_TASKS.map(t => saveWritingTask(t.num));
    else if (sectionType === 'Speaking')  promises = IELTS.SPEAKING_PARTS.map(p => saveSpeakingPart(p.num));
    await Promise.all(promises);
    Toast.success(`${sectionType} successfully saved`);
    updateTally();
  } catch(e) {
    console.error(e);
    Toast.error(`Failed to save ${sectionType}`);
  }
}

async function saveSectionPart(sectionType, partNum) {
  const prefix = sectionType === 'Listening' ? `listen-p${partNum}` : `read-p${partNum}`;

  const targetVal = document.getElementById(`${prefix}-target`)?.value;
  const scoreVal  = document.getElementById(`${prefix}-score-inp`)?.value;
  const maxVal    = document.getElementById(`${prefix}-max`)?.value;
  const countVal  = document.getElementById(`${prefix}-qcount`)?.value;
  const notes     = document.getElementById(`${prefix}-notes`)?.value || '';

  const section = await api.post(`/api/tests/${TEST_ID}/sections`, {
    section_type: sectionType,
    part_number:  partNum,
    time_taken_seconds: 0,
    target_time_seconds: targetVal ? parseInt(targetVal) * 60 : 0,
    score:    scoreVal ? parseFloat(scoreVal) : 0,
    max_score: maxVal ? parseFloat(maxVal) : (parseInt(countVal) || 10),
    notes
  });

  const tbody = document.getElementById(`${prefix}-body`);
  const rows  = tbody?.querySelectorAll('tr.q-row') || [];
  const questions = [];

  rows.forEach(row => {
    const qnum   = parseInt(row.dataset.qnum);
    const myAnswerInput = row.querySelector('.q-answer-input');
    const toggle = row.querySelector('.correct-toggle');
    const valMap = { '1': 1, '0': 0, '': null };
    questions.push({
      question_number: qnum,
      question_type:   '',
      my_answer:       myAnswerInput?.value || '',
      correct_answer:  '',
      is_correct:      valMap[toggle?.dataset.val ?? ''] ?? null,
      personal_note:   '',
      word_count:      0
    });
  });

  if (questions.length) {
    await api.post(`/api/sections/${section.id}/questions/bulk`, { questions });
  }
}

async function saveWritingTask(taskNum) {
  const targetVal = document.getElementById(`write-t${taskNum}-target`)?.value;
  const scoreVal  = document.getElementById(`write-t${taskNum}-score`)?.value;
  const myText    = document.getElementById(`write-t${taskNum}-my`)?.value || '';
  const correct   = document.getElementById(`write-t${taskNum}-correct`)?.value || '';
  const notes     = document.getElementById(`write-t${taskNum}-notes`)?.value || '';

  const section = await api.post(`/api/tests/${TEST_ID}/sections`, {
    section_type: 'Writing',
    part_number:  taskNum,
    time_taken_seconds: 0,
    target_time_seconds: targetVal ? parseInt(targetVal) * 60 : 0,
    score:     scoreVal ? parseFloat(scoreVal) : 0,
    max_score: 9,
    notes
  });

  await api.post(`/api/sections/${section.id}/questions/bulk`, {
    questions: [{
      question_number: 1,
      question_type:   taskNum === 1 ? 'Visual Description' : 'Essay',
      my_answer:       myText,
      correct_answer:  correct,
      is_correct:      null,
      personal_note:   '',
      word_count:      countWords(myText)
    }]
  });
}

async function saveSpeakingPart(partNum) {
  const scoreVal  = document.getElementById(`speak-p${partNum}-score`)?.value;
  const targetVal = document.getElementById(`speak-p${partNum}-target`)?.value;
  const topic    = document.getElementById(`speak-p${partNum}-topic`)?.value || '';
  const myNotes  = document.getElementById(`speak-p${partNum}-mynotes`)?.value || '';
  const feedback = document.getElementById(`speak-p${partNum}-feedback`)?.value || '';
  const notes    = document.getElementById(`speak-p${partNum}-notes`)?.value || '';

  const section = await api.post(`/api/tests/${TEST_ID}/sections`, {
    section_type: 'Speaking',
    part_number:  partNum,
    time_taken_seconds: 0,
    target_time_seconds: targetVal ? parseInt(targetVal) * 60 : 0,
    score:     scoreVal ? parseFloat(scoreVal) : 0,
    max_score: 9,
    notes
  });

  await api.post(`/api/sections/${section.id}/questions/bulk`, {
    questions: [{
      question_number: 1,
      question_type:   `Part ${partNum}`,
      my_answer:       topic,
      correct_answer:  feedback,
      is_correct:      null,
      personal_note:   myNotes,
      word_count:      0
    }]
  });
}

// ─── Load Session ─────────────────────────────────────────────────────────

async function loadSessionData() {
  if (!TEST_ID) { window.location.href = '/'; return; }
  try {
    const test = await api.get(`/api/tests/${TEST_ID}`);
    currentTest = test;
    const sessionScope = test.test_section || 'Full Test';

    document.getElementById('breadcrumb-test').textContent = `Test ${test.test_number}`;
    document.title = `Test ${test.test_number} — IELTS Prep`;

    const modeBadge = document.getElementById('test-mode-badge');
    if (test.mode === 'mock') {
      modeBadge.className = 'mode-badge badge-purple';
      modeBadge.textContent = 'Mock Test';
    } else {
      modeBadge.className = 'mode-badge badge-blue';
      modeBadge.textContent = 'Practice';
    }

    const sections = await api.get(`/api/tests/${TEST_ID}/sections`);
    const existBySection  = { Listening: [], Reading: [], Writing: [], Speaking: [] };
    const questionsBySecId = {};

    for (const sec of sections) {
      existBySection[sec.section_type].push(sec);
      const qs = await api.get(`/api/sections/${sec.id}/questions`);
      questionsBySecId[sec.id] = qs;
    }

    const existData = (type) => ({ sections: existBySection[type], questions: questionsBySecId });

    buildListeningParts(existData('Listening'));
    buildReadingPassages(existData('Reading'));
    buildWritingTasks(existData('Writing'));
    buildSpeakingParts(existData('Speaking'));
    configureSessionScope(sessionScope);

    const allBooks = await api.get('/api/books');
    for (const book of allBooks) {
      const bookTests = await api.get(`/api/books/${book.id}/tests`);
      if (bookTests.find(t => String(t.id) === String(TEST_ID))) {
        currentBook = book;
        document.getElementById('breadcrumb-book').textContent = book.name;
        document.getElementById('breadcrumb-book').href = `/book.html?id=${book.id}`;
        document.getElementById('btn-back-book').href    = `/book.html?id=${book.id}`;
        break;
      }
    }

    document.getElementById('edit-test-num').value   = test.test_number;
    document.getElementById('edit-test-mode').value  = test.mode;
    document.getElementById('edit-test-date').value  = test.date;
    document.getElementById('edit-test-score').value = test.total_score || '';
    document.getElementById('edit-test-notes').value = test.notes || '';

    updateTally();
    switchSection(sessionScope === 'Full Test' ? 'Listening' : sessionScope);
    
    // Start auto-save after session loads
    startAutoSave();
  } catch(e) {
    console.error(e);
    Toast.error('Failed to load session data');
  }
}

function configureSessionScope(sessionScope) {
  const isFullTest = (sessionScope === 'Full Test');
  const topbarTabs = document.querySelector('.topbar-tabs');
  const secSep = document.getElementById('breadcrumb-sec-sep');
  const secTitle = document.getElementById('breadcrumb-sec-title');
  const testSpan = document.getElementById('breadcrumb-test');

  if (isFullTest) {
    if (topbarTabs) topbarTabs.classList.remove('hidden');
    if (secSep) secSep.classList.add('hidden');
    if (secTitle) secTitle.classList.add('hidden');
    if (testSpan) testSpan.className = 'current';
  } else {
    // Dedicated Single Section Session (e.g. Writing) -> Clean Breadcrumb merge: Dashboard > Book > Test 1 > Writing
    if (topbarTabs) topbarTabs.classList.add('hidden');
    if (secSep) secSep.classList.remove('hidden');
    if (secTitle) {
      secTitle.textContent = sessionScope;
      secTitle.classList.remove('hidden');
    }
    if (testSpan) {
      testSpan.className = '';
    }
  }

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('session-out-of-scope', !isFullTest && panel.id !== `panel-${sessionScope}`);
  });

  const badge = document.getElementById('test-mode-badge');
  if (badge) badge.textContent = isFullTest ? (currentTest?.mode === 'mock' ? 'Mock Test' : 'Practice') : `${sessionScope} session`;
}

// ─── Edit Test ────────────────────────────────────────────────────────────

document.getElementById('btn-edit-test').addEventListener('click', () => Modal.open('modal-edit-test'));

document.getElementById('btn-update-test').addEventListener('click', async () => {
  try {
    const testNum = document.getElementById('edit-test-num').value.trim();
    if (!testNum) {
      Toast.error('Test number is required');
      return;
    }
    await api.put(`/api/tests/${TEST_ID}`, {
      test_number:  testNum,
      mode:         document.getElementById('edit-test-mode').value,
      date:         document.getElementById('edit-test-date').value,
      total_score:  document.getElementById('edit-test-score').value || null,
      notes:        document.getElementById('edit-test-notes').value
    });
    Modal.close('modal-edit-test');
    Toast.success('Test updated');
    loadSessionData();
  } catch(e) {
    Toast.error('Failed to update test');
  }
});

// ─── Utility ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ─── Init ─────────────────────────────────────────────────────────────────
loadSessionData();

// Stop auto-save when leaving the page
window.addEventListener('beforeunload', () => {
  stopAutoSave();
  // Optionally do a final save
  if (TEST_ID) {
    saveAllSections();
  }
});
