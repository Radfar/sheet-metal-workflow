const $ = id => document.getElementById(id);
let components = [];

const schedule = [
  {no:1,tag:"T01A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:2},
  {no:2,tag:"T01B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:3},
  {no:3,tag:"T01C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:4},
  {no:4,tag:"T02A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:5},
  {no:5,tag:"T02B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:6},
  {no:6,tag:"T03A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:7},
  {no:7,tag:"T03B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:8},
  {no:8,tag:"T03C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:9},
  {no:9,tag:"T04A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:10},
  {no:10,tag:"T04B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:11},
  {no:11,tag:"T05A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:12},
  {no:12,tag:"T05B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:13},
  {no:13,tag:"T06",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'110"',finish:"M-12 EA",qty:14},
  {no:14,tag:"T07",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'307"',finish:"M-12 EA",qty:15},
  {no:15,tag:"T08",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'191"',length:'221"',finish:"M-12 EA",qty:16},
  {no:16,tag:"T09A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:17},
  {no:17,tag:"T09B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:18},
  {no:18,tag:"T10",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'221"',length:'136"',finish:"M-12 EA",qty:19},
  {no:19,tag:"T11",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'177"',length:'221"',finish:"M-12 EA",qty:20},
  {no:20,tag:"T12",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'158"',length:'206"',finish:"M-12 EA",qty:21},
  {no:21,tag:"T13A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:22},
  {no:22,tag:"T13B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:23},
  {no:23,tag:"T13C",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:24},
  {no:24,tag:"T14",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'154"',length:'206"',finish:"M-12 EA",qty:25},
  {no:25,tag:"T15",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'479"',finish:"M-12 EA",qty:26},
  {no:26,tag:"T16",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'203"',finish:"M-12 EA",qty:27},
  {no:27,tag:"T17",mounting:"Recessed in brick wall",height:"N/A",profile:"Linear",width:'4"',length:'48"',finish:"M-12 EK",qty:10}
];

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

function renderSchedule() {
  $("scheduleRows").innerHTML = schedule.map((s, i) =>
    '<tr data-schedule-index="' + i + '">' +
      '<td>' + esc(s.no) + '</td>' +
      '<td><input class="schedule-cell tag-cell" data-schedule-field="tag" value="' + esc(s.tag) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="mounting" value="' + esc(s.mounting) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="height" value="' + esc(s.height) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="profile" value="' + esc(s.profile) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="width" value="' + esc(s.width) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="length" value="' + esc(s.length) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="finish" value="' + esc(s.finish) + '"></td>' +
      '<td><input class="schedule-cell qty-cell" type="number" min="0" step="any" data-schedule-field="qty" value="' + esc(s.qty) + '"></td>' +
      '<td><button class="use-schedule" data-use-schedule="' + i + '" type="button">Use</button></td>' +
    '</tr>'
  ).join("");
}

function renderSummary() {
  $("summaryRows").innerHTML = schedule.map(s =>
    '<tr>' +
      '<td>' + esc(s.no) + '</td><td>' + esc(s.tag) + '</td><td>' + esc(s.mounting) + '</td>' +
      '<td>' + esc(s.height) + '</td><td>' + esc(s.profile) + '</td><td>' + esc(s.width) + '</td>' +
      '<td>' + esc(s.length) + '</td><td>' + esc(s.finish) + '</td><td>' + esc(s.qty) + '</td>' +
      '<td>' + (s.tag === $("fixtureTag").value ? esc(components.length) : "—") + '</td>' +
    '</tr>'
  ).join("");
}

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
      '<td><input class="cell" data-field="description" placeholder="Description" value="' + esc(c.description) + '"></td>' +
      '<td><button class="remove" data-remove="' + i + '">×</button></td>' +
    '</tr>'
  ).join("");

  renderSummary();
}

$("scheduleRows").addEventListener("input", e => {
  const el = e.target.closest("[data-schedule-field]");
  if (!el) return;
  const row = schedule[Number(el.closest("tr").dataset.scheduleIndex)];
  row[el.dataset.scheduleField] = el.dataset.scheduleField === "qty" ? Number(el.value) : el.value;
});

$("scheduleRows").addEventListener("click", e => {
  const b = e.target.closest("[data-use-schedule]");
  if (!b) return;
  const s = schedule[Number(b.dataset.useSchedule)];
  $("fixtureTag").value = s.tag;
  $("fixtureQuantity").value = s.qty;
  $("fixtureDescription").value = [s.mounting, s.profile, s.width, s.length].filter(Boolean).join(" - ");
  $("finish").value = s.finish;
  $("scheduleStatus").textContent = s.tag + " loaded into the BOM inputs.";
  $("scheduleStatus").className = "ok";
  renderSummary();
});

$("componentRows").addEventListener("input", e => {
  const el = e.target.closest("[data-field]");
  if (el) {
    components[Number(el.closest("tr").dataset.index)][el.dataset.field] = el.value;
    renderSummary();
  }
});

$("componentRows").addEventListener("click", e => {
  const b = e.target.closest("[data-remove]");
  if (b) {
    components.splice(Number(b.dataset.remove), 1);
    render();
  }
});

$("addScheduleRowBtn").addEventListener("click", () => {
  const nextNo = schedule.length + 1;
  schedule.push({ no: nextNo, tag: "", mounting: "", height: "", profile: "", width: "", length: "", finish: "", qty: "" });
  renderSchedule();
  $("scheduleStatus").textContent = "New schedule row added. Enter the values directly in the row.";
  $("scheduleStatus").className = "ok";
});

$("parseBtn").addEventListener("click", async () => {
  const s = $("parseStatus");
  s.textContent = "Parsing…";
  s.className = "";

  try {
    const r = await fetch("/api/parse-dxf-list", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({filenames: $("dxfInput").value})
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
    originalFilename:"",
    fixtureTag:$("fixtureTag").value,
    materialCode:"",
    componentLabel:"",
    flatWidth:"",
    flatHeight:"",
    quantityPerAssembly:"",
    description:"",
    notes:"",
    warnings:["Manually added; verify all fields"]
  });
  render();
});

$("generateSummaryBtn").addEventListener("click", () => {
  renderSummary();
  $("summaryStatus").textContent = schedule.length + " fixture schedule rows generated.";
  $("summaryStatus").className = "ok";
});

$("exportBtn").addEventListener("click", async () => {
  const status = $("parseStatus");
  const button = $("exportBtn");
  button.disabled = true;
  status.textContent = "Generating Excel BOM…";
  status.className = "";

  try {
    const payload = {
      customer:$("customer").value,
      projectName:$("projectName").value,
      poNumber:$("poNumber").value,
      projectNumber:$("projectNumber").value,
      fixtureTag:$("fixtureTag").value,
      fixtureQuantity:$("fixtureQuantity").value,
      fixtureDescription:$("fixtureDescription").value,
      finish:$("finish").value,
      components
    };

    const response = await fetch("/api/export-bom-xlsx", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
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

const logoutButton = $("logoutBtn");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", {method:"POST"});
    window.location.replace("/login");
  });
}

renderSchedule();
render();
