// ─── State machine ───────────────────────────────────────────────────────────
const PANELS = ['idle', 'table', 'confirm', 'htu-prompt', 'htu-import', 'loading'];

function showPanel(name) {
  PANELS.forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.classList.toggle('active', p === name);
  });
}

// ─── State ────────────────────────────────────────────────────────────────────
let lastResult = null;
let pendingAction = null; // 'full-doc' | 'how-to-use'

// ─── Elements ─────────────────────────────────────────────────────────────────
const inspectBtn       = document.getElementById('inspectBtn');
const inspectBtn2      = document.getElementById('inspectBtn2');
const copyJsonBtn      = document.getElementById('copyJsonBtn');
const generateDocBtn   = document.getElementById('generateDocBtn');
const generateFullDocBtn = document.getElementById('generateFullDocBtn');
const getKeyBtn        = document.getElementById('getKeyBtn');
const confirmYesBtn    = document.getElementById('confirmYesBtn');
const confirmNoBtn     = document.getElementById('confirmNoBtn');
const confirmWarnText  = document.getElementById('confirmWarnText');
const htuYesBtn        = document.getElementById('htuYesBtn');
const htuNoBtn         = document.getElementById('htuNoBtn');
const htuPasteArea     = document.getElementById('htuPasteArea');
const htuImportBtn     = document.getElementById('htuImportBtn');
const htuCancelBtn     = document.getElementById('htuCancelBtn');

// ─── Loading dots animation ───────────────────────────────────────────────────
setInterval(() => {
  const dots = document.getElementById('dots');
  if (!dots) return;
  dots.textContent = dots.textContent.length >= 3 ? '' : dots.textContent + '.';
}, 400);

// ─── Clipboard helpers ────────────────────────────────────────────────────────
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// ─── Inspect ──────────────────────────────────────────────────────────────────
function doInspect() {
  parent.postMessage({ pluginMessage: { type: 'inspect' } }, '*');
}
inspectBtn.onclick = doInspect;
inspectBtn2.onclick = doInspect;

// ─── Copy JSON ────────────────────────────────────────────────────────────────
copyJsonBtn.onclick = async () => {
  if (!lastResult) return;
  const ok = await copyText(JSON.stringify(lastResult, null, 2));
  if (!ok) alert('Не удалось скопировать JSON');
};

// ─── Docs ─────────────────────────────────────────────────────────────────────
generateDocBtn.onclick = () => {
  pendingAction = 'props-only';
  showPanel('loading');
  parent.postMessage({ pluginMessage: { type: 'generate-documentation' } }, '*');
};

generateFullDocBtn.onclick = () => {
  // Сначала проверяем существующие фреймы
  parent.postMessage({ pluginMessage: { type: 'check-frames' } }, '*');
};

// ─── Confirm overwrite ────────────────────────────────────────────────────────
confirmYesBtn.onclick = () => {
  pendingAction = 'full-doc';
  showPanel('loading');
  parent.postMessage({ pluginMessage: { type: 'generate-full-documentation' } }, '*');
};

confirmNoBtn.onclick = () => showPanel('table');

// ─── How to use prompt ────────────────────────────────────────────────────────
htuYesBtn.onclick = async () => {
  if (lastResult) {
    await copyText(JSON.stringify(lastResult, null, 2));
  }
  htuPasteArea.value = '';
  showPanel('htu-import');
};

htuNoBtn.onclick = () => showPanel('table');

// ─── How to use import ────────────────────────────────────────────────────────
htuImportBtn.onclick = () => {
  const text = htuPasteArea.value.trim();
  if (!text) {
    alert('Вставь JSON из Claude Code перед импортом');
    return;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    alert('Не удалось разобрать JSON. Убедись что вставлен полный результат команды /generate-how-to-use');
    return;
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    alert('JSON не содержит секций. Запусти /generate-how-to-use в Claude Code заново');
    return;
  }
  pendingAction = 'how-to-use';
  showPanel('loading');
  parent.postMessage({ pluginMessage: { type: 'import-how-to-use', data } }, '*');
};

htuCancelBtn.onclick = () => showPanel('table');

// ─── Get key ──────────────────────────────────────────────────────────────────
getKeyBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'get-key' } }, '*');
};

// ─── Messages from main.ts ────────────────────────────────────────────────────
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'key-result') {
    alert('Key: ' + msg.key);
    return;
  }

  if (msg.type === 'progress') {
    const el = document.getElementById('loadingProgress');
    if (el) el.textContent = `Проп ${msg.current} из ${msg.total}`;
    return;
  }

  if (msg.type === 'frames-check-result') {
    if (msg.existing && msg.existing.length > 0) {
      confirmWarnText.innerHTML =
        '<strong>Уже существуют фреймы:</strong><br>' +
        msg.existing.map(n => `• ${n}`).join('<br>');
      showPanel('confirm');
    } else {
      // Фреймов нет — генерируем сразу
      pendingAction = 'full-doc';
      showPanel('loading');
      parent.postMessage({ pluginMessage: { type: 'generate-full-documentation' } }, '*');
    }
    return;
  }

  if (msg.type === 'generation-finished') {
    if (pendingAction === 'full-doc') {
      showPanel('htu-prompt');
    } else {
      // props-only или how-to-use — возвращаемся к таблице
      showPanel('table');
    }
    pendingAction = null;
    return;
  }

  if (msg.type === 'result') {
    lastResult = msg.data;

    if (msg.data?.error) {
      showPanel('idle');
      return;
    }

    const data = msg.data;
    const props = data.props || [];
    const validation = data.validation || {};

    const metaEl = document.getElementById('meta');
    if (metaEl) {
      metaEl.innerHTML = `
        <div><b>${data.component || '-'}</b> &nbsp;·&nbsp; ${data.type || ''} &nbsp;·&nbsp; ${data.description || ''}</div>
        <div style="margin-top:4px;">
          Всего: ${validation.total || 0} &nbsp;
          OK: ${validation.ok || 0} &nbsp;
          Review: ${validation.review || 0} &nbsp;
          Unknown: ${validation.unknown || 0}
        </div>
      `;
    }

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
      tableContainer.innerHTML = buildTable(props);
      tableContainer.className = '';
    }

    showPanel('table');
    return;
  }
};

// ─── Table builder ────────────────────────────────────────────────────────────
function buildTable(props) {
  if (!props?.length) return '<div class="empty">Пропы не найдены</div>';

  const rows = props.map(prop => {
    const cls =
      prop.status === 'WRONG_CASE' ? 'status-wrong_case' :
      prop.status === 'REVIEW'     ? 'status-review' :
      prop.status === 'UNKNOWN'    ? 'status-unknown' : '';
    return `
      <tr class="${cls}">
        <td>${esc(prop.pixsoName ?? '')}</td>
        <td>${esc(prop.designName ?? '')}</td>
        <td>${esc(prop.codeName ?? '')}</td>
        <td>${esc(fmtValues(prop.values))}</td>
        <td>${esc(prop.status ?? '')}</td>
        <td>${esc(prop.suggestedName ?? '')}</td>
      </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr><th>Pixso</th><th>Design</th><th>Code</th><th>Values</th><th>Status</th><th>Suggestion</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function fmtValues(values) {
  if (!values) return '';
  if (Array.isArray(values)) return values.join(', ');
  if (typeof values === 'object') return Object.keys(values).join(', ');
  return String(values);
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
