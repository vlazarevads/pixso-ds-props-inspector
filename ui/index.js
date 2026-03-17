const inspectBtn = document.getElementById("inspectBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const copyTableBtn = document.getElementById("copyTableBtn");
const generateDocBtn = document.getElementById("generateDocBtn");
const loadingGif = document.getElementById("loadingGif");
if (loadingGif) {
  loadingGif.src = "";
}

setInterval(() => {
  const dots = document.getElementById("dots");
  if (!dots) return;

  dots.textContent =
    dots.textContent.length >= 3
      ? ""
      : dots.textContent + ".";
}, 400);

let lastResult = null;

inspectBtn.onclick = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "inspect",
      },
    },
    "*"
  );
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.warn("navigator.clipboard failed, fallback used", e);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (e) {
    console.error("Fallback copy failed", e);
    return false;
  }
}

copyJsonBtn.onclick = async () => {
  if (!lastResult) return;

  const success = await copyText(JSON.stringify(lastResult, null, 2));
  if (!success) {
    alert("Не удалось скопировать JSON");
  }
};

copyTableBtn.onclick = async () => {
  if (!lastResult?.props?.length) return;

  const header = [
    "Pixso",
    "Design",
    "Code",
    "Type",
    "Status",
    "Suggestion",
  ];

  const rows = lastResult.props.map((prop) => [
    prop.pixsoName || "",
    prop.designName || "",
    prop.codeName || "",
    formatPropValues(prop.values),
    prop.status || "",
    prop.suggestedName || "",
  ]);

  const markdown = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

  const success = await copyText(markdown);
  if (!success) {
    alert("Не удалось скопировать таблицу");
  }
};

generateDocBtn.onclick = () => {
  showLoading();

  parent.postMessage(
    { pluginMessage: { type: "generate-documentation" } },
    "*"
  );
};

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "progress") {
    const el = document.getElementById("loadingProgress");
    if (el) {
      el.textContent = `Проп ${msg.current} из ${msg.total}`;
    }
    return;
  }

  if (msg.type === "generation-finished") {
    hideLoading();
    return;
  }

  if (msg.type === "result") {
    lastResult = msg.data;

    const metaEl = document.getElementById("meta");
    const tableContainer = document.getElementById("tableContainer");
    const statusEl = document.getElementById("status");

    if (!tableContainer) return;

    if (msg.data?.error) {
      if (metaEl) metaEl.textContent = msg.data.error;
      tableContainer.innerHTML = "Таблица пока не построена";
      tableContainer.className = "empty";
      if (statusEl) statusEl.textContent = "";
      return;
    }

    const data = msg.data;
    const props = data.props || [];
    const validation = data.validation || {};

    if (metaEl) {
      metaEl.innerHTML = `
        <div>Component: ${data.component || "-"}</div>
        <div>Type: ${data.type || "-"}</div>
        <div>Description: ${data.description || "-"}</div>
        <div>
          Validation: total ${validation.total || 0},
          ok ${validation.ok || 0},
          review ${validation.review || 0},
          wrongCase ${validation.wrongCase || 0},
          unknown ${validation.unknown || 0}
        </div>
      `;
    }

    const table = buildTable(props);
    tableContainer.innerHTML = table;
    tableContainer.className = "";

    if (statusEl) {
      statusEl.textContent = `Найдено пропов: ${props.length}`;
    }
  }
};

function showLoading() {
  document.getElementById("app").style.display = "none";
  document.getElementById("loading").style.display = "block";
}

function hideLoading() {
  document.getElementById("app").style.display = "block";
  document.getElementById("loading").style.display = "none";
}

function buildTable(props) {
  if (!props?.length) return "Пропы не найдены";

  const rows = props
    .map((prop) => {
      const statusClass =
        prop.status === "OK"
          ? "status-ok"
          : prop.status === "WRONG_CASE"
          ? "status-warn"
          : prop.status === "REVIEW"
          ? "status-review"
          : "status-unknown";

      return `
        <tr>
          <td>${escapeHtml(prop.pixsoName ?? "")}</td>
          <td>${escapeHtml(prop.designName ?? "")}</td>
          <td>${escapeHtml(prop.codeName ?? "")}</td>
          <td>${escapeHtml(formatPropValues(prop.values))}</td>
          <td class="${statusClass}">${escapeHtml(prop.status ?? "")}</td>
          <td>${escapeHtml(prop.suggestedName ?? "")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Pixso</th>
          <th>Design</th>
          <th>Code</th>
          <th>Values</th>
          <th>Status</th>
          <th>Suggestion</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function formatPropValues(values) {
  if (!values) return "";

  if (Array.isArray(values)) {
    return values.join(", ");
  }

  if (typeof values === "object") {
    return Object.keys(values).join(", ");
  }

  return String(values);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}