const $ = id => document.getElementById(id);
let components = [];

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

function render() {
  $("rowCount").textContent = components.length + " component" + (components.length === 1 ? "" : "s");
  $("exportBtn").disabled = !components.length;

  const body = $("componentRows");

  if (!components.length) {
    body.innerHTML = '<tr><td colspan="9" class="empty">No components yet.</td></tr>';
    return;
  }

  body.innerHTML = components.map((c, i) =>
    '<tr data-index="' + i + '">' +
      '<td><input class="cell filename" data-field="originalFilename" value="' + esc(c.originalFilename) + '">' +
        (c.warnings || []).map(w => '<span class="warning">' + esc(w) + '</span>').join("") +
      '</td>' +
      '<td><input class="cell" data-field="fixtureTag" value="' + esc(c.fixtureTag) + '"></td>' +
      '<td><input class="cell" data-field="materialCode" value="' + esc(c.materialCode) + '"></td>' +
      '<td><input class="cell" data-field="componentLabel" value="' + esc(c.componentLabel) + '"></td>' +
      '<td><input class="cell" data-field="flatWidth" value="' + esc(c.flatWidth) + '"></td>' +
      '<td><input class="cell" data-field="flatHeight" value="' + esc(c.flatHeight) + '"></td>' +
      '<td><input class="cell" type="number" min="0" step="any" data-field="quantityPerAssembly" value="' + esc(c.quantityPerAssembly) + '"></td>' +
      '<td><input class="cell notes" placeholder="Description" data-field="description" value="' + esc(c.description) + '">' +
        '<input class="cell notes" placeholder="Engineering notes" data-field="notes" value="' + esc(c.notes) + '"></td>' +
      '<td><button class="remove" data-remove="' + i + '">×</button></td>' +
    '</tr>'
  ).join("");
}

$("componentRows").addEventListener("input", e => {
  const el = e.target.closest("[data-field]");
  if (el) {
    components[Number(el.closest("tr").dataset.index)][el.dataset.field] = el.value;
  }
});

$("componentRows").addEventListener("click", e => {
  const b = e.target.closest("[data-remove]");
  if (b) {
    components.splice(Number(b.dataset.remove), 1);
    render();
  }
});

$("parseBtn").addEventListener("click", async () => {
  const s = $("parseStatus");
  s.textContent = "Parsing…";
  s.className = "";

  try {
    const r = await fetch("/api/parse-dxf-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filenames: $("dxfInput").value })
    });

    const d = await r.json();

    if (!r.ok) throw Error(d.error || "Parsing failed");

    components = d.components;
    render();
    s.textContent = components.length + " filename(s) parsed. Review all warnings and missing fields.";
    s.className = "ok";
  } catch (e) {
    s.textContent = e.message;
    s.className = "error";
  }
});

$("addRowBtn").addEventListener("click", () => {
  components.push({
    originalFilename: "",
    fixtureTag: $("fixtureTag").value,
    materialCode: "",
    componentLabel: "",
    flatWidth: "",
    flatHeight: "",
    quantityPerAssembly: "",
    description: "",
    notes: "",
    warnings: ["Manually added; verify all fields"]
  });
  render();
});

$("exportBtn").addEventListener("click", async () => {
  const status = $("parseStatus");
  const button = $("exportBtn");

  button.disabled = true;
  status.textContent = "Generating Excel BOM…";
  status.className = "";

  try {
    const payload = {
      customer: $("customer").value,
      projectName: $("projectName").value,
      poNumber: $("poNumber").value,
      projectNumber: $("projectNumber").value,
      fixtureTag: $("fixtureTag").value,
      fixtureQuantity: $("fixtureQuantity").value,
      fixtureDescription: $("fixtureDescription").value,
      finish: $("finish").value,
      components
    };

    const response = await fetch("/api/export-bom-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw Error(error.error || "Excel export failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BOM - " + ($("projectNumber").value || $("projectName").value || "project") +
      " - " + ($("fixtureTag").value || "fixture") + ".xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    status.textContent = "Excel BOM generated successfully.";
    status.className = "ok";
  } catch (e) {
    status.textContent = e.message;
    status.className = "error";
  } finally {
    button.disabled = !components.length;
  }
});
