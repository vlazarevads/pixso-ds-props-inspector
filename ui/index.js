const inspectBtn = document.getElementById("inspectBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const copyTableBtn = document.getElementById("copyTableBtn");
const generateDocBtn = document.getElementById("generateDocBtn");

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

copyJsonBtn.onclick = async () => {
  if (!lastResult) return;

  try {
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
  } catch (e) {
    console.error(e);
  }
};

copyTableBtn.onclick = async () => {
  if (!lastResult?.props?.length) return;

  const header = [
    "Pixso",
    "Design",
    "Code",
    "Type",
    "Default",
    "Status",
    "Suggestion",
  ];

  const rows = lastResult.props.map((prop) => [
    prop.pixsoName || "",
    prop.designName || "",
    prop.codeName || "",
    prop.type || "",
    prop.defaultValue ?? "",
    prop.status || "",
    prop.suggestedName || "",
  ]);

  const markdown = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

  try {
    await navigator.clipboard.writeText(markdown);
  } catch (e) {
    console.error(e);
  }
};

generateDocBtn.onclick = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "generate-documentation",
      },
    },
    "*"
  );
};

window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

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
          <td>${escapeHtml(prop.type ?? "")}</td>
          <td>${escapeHtml(String(prop.defaultValue ?? ""))}</td>
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
          <th>Type</th>
          <th>Default</th>
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}