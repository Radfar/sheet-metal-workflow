const $ = id => document.getElementById(id);

let components = [];
let bomLines = [];
let dxfFiles = [];
let currentFixtureTag = "";
const fixtureData = {};

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

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePart(value, fixtureTag) {
  let text = String(value || "").toUpperCase().trim();
  if (fixtureTag && text.startsWith(fixtureTag.toUpperCase())) {
    text = text.slice(fixtureTag.length);
  }
  text = text.replace(/REMOVABLE[\s_-]*GUSSET/g, "GUS");
  text = text.replace(/\bTROUGH\b/g, "");
  return text.replace(/[^A-Z0-9]/g, "");
}

function matchDxfIndex(partNumber, files, fixtureTag) {
  const target = normalizePart(partNumber, fixtureTag);
  if (!target) return "";
  let bestIndex = -1;
  let bestScore = 0;

  files.forEach((file, index) => {
    const candidate = normalizePart(file.componentLabel, fixtureTag);
    if (!candidate) return;
    let score = 0;
    if (candidate === target) score = 100;
    else if (candidate.startsWith(target) || target.startsWith(candidate)) score = 80;
    else if (candidate.includes(target) || target.includes(candidate)) score = 60;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestScore >= 60 ? bestIndex : "";
}

function rebuildComponents() {
  components = bomLines.map(line => ({
    itemNo: line.itemNo,
    partNumber: line.partNumber,
    quantityPerAssembly: line.quantityPerAssembly,
    description: line.description || "",
    dxfIndex: matchDxfIndex(line.partNumber, dxfFiles, currentFixtureTag),
    manual: Boolean(line.manual)
  }));
  render();
}

function saveCurrentFixture() {
  if (!currentFixtureTag) return;
  fixtureData[currentFixtureTag] = {
    bomLines: clone(bomLines),
    dxfFiles: clone(dxfFiles),
    components: clone(components),
    dxfText: $("dxfInput").value
  };
}

function fixtureDescriptionFromSchedule(item) {
  if (!item) return "";
  return item.mounting + ' "' + item.profile + '" profile ' + item.width + " x " + item.length;
}

function renderScheduleEditor() {
  $("scheduleRows").innerHTML = schedule.map((item, index) =>
    '<tr data-schedule-index="' + index + '">' +
      '<td>' + esc(item.no) + '</td>' +
      '<td><input class="schedule-cell tag-cell" data-schedule-field="tag" value="' + esc(item.tag) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="mounting" value="' + esc(item.mounting) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="height" value="' + esc(item.height) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="profile" value="' + esc(item.profile) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="width" value="' + esc(item.width) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="length" value="' + esc(item.length) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="finish" value="' + esc(item.finish) + '"></td>' +
      '<td><input class="schedule-cell qty-cell" type="number" min="0" step="any" data-schedule-field="qty" value="' + esc(item.qty) + '"></td>' +
    '</tr>'
  ).join("");
}

function renderFixtureOptions() {
  const previous = $("fixtureSelect").value;
  $("fixtureSelect").innerHTML = schedule.map(item =>
    '<option value="' + esc(item.tag) + '">' + esc(item.tag) + '</option>'
  ).join("");
  if (schedule.some(item => item.tag === previous)) $("fixtureSelect").value = previous;
}

function renderSelectedSchedule() {
  const item = schedule.find(entry => entry.tag === currentFixtureTag);
  $("selectedScheduleRow").innerHTML = item
    ? '<tr><td><strong>' + esc(item.tag) + '</strong></td><td>' + esc(item.mounting) +
      '</td><td>' + esc(item.height) + '</td><td>' + esc(item.profile) +
      '</td><td>' + esc(item.width) + '</td><td>' + esc(item.length) +
      '</td><td>' + esc(item.finish) + '</td><td><strong>' + esc(item.qty) + '</strong></td></tr>'
    : '<tr><td colspan="8" class="empty">No matching fixture tag in the schedule.</td></tr>';
}

function renderSummary() {
  $("summaryRows").innerHTML = schedule.map(item => {
    const saved = fixtureData[item.tag];
    const count = item.tag === currentFixtureTag ? components.length : (saved?.components?.length || 0);
    return '<tr><td>' + esc(item.no) + '</td><td>' + esc(item.tag) + '</td><td>' +
      esc(item.mounting) + '</td><td>' + esc(item.profile) + '</td><td>' +
      esc(item.width) + '</td><td>' + esc(item.length) + '</td><td>' +
      esc(item.finish) + '</td><td>' + esc(item.qty) + '</td><td>' +
      (count ? esc(count) : "—") + '</td></tr>';
  }).join("");
}

function renderComponents() {
  $("rowCount").textContent = components.length + " BOM item" + (components.length === 1 ? "" : "s");
  $("exportBtn").disabled = components.length === 0;
  const body = $("componentRows");

  if (!components.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Import the SolidWorks BOM for ' +
      esc(currentFixtureTag) + '. DXF filenames can be parsed before or after the BOM import.</td></tr>';
    renderSummary();
    return;
  }

  const options = '<option value="">No DXF (purchased / not supplied)</option>' +
    dxfFiles.map((file, index) =>
      '<option value="' + index + '">' + esc(file.originalFilename) + '</option>'
    ).join("");

  body.innerHTML = components.map((component, index) => {
    const dxf = component.dxfIndex === "" || component.dxfIndex == null
      ? null : dxfFiles[Number(component.dxfIndex)];
    const matchWarning = !dxf ? '<span class="match-note">No DXF matched. This may be a purchased item.</span>' : "";
    const flatSize = dxf ? esc(dxf.flatWidth) + " × " + esc(dxf.flatHeight) : "—";
    const material = dxf ? esc(dxf.materialCode || "Not detected") : "—";
    return '<tr data-component-index="' + index + '">' +
      '<td>' + esc(component.itemNo || index + 1) + '</td>' +
      '<td><input class="cell part-cell" data-component-field="partNumber" value="' + esc(component.partNumber) + '" ' + (component.manual ? "" : "readonly") + '></td>' +
      '<td><input class="cell qty-cell" type="number" min="0" step="any" data-component-field="quantityPerAssembly" value="' + esc(component.quantityPerAssembly) + '" ' + (component.manual ? "" : "readonly") + '></td>' +
      '<td><select class="match-select" data-dxf-select>' + options + '</select>' + matchWarning + '</td>' +
      '<td>' + material + '</td><td>' + flatSize + '</td>' +
      '<td><input class="cell description-cell" data-component-field="description" value="' + esc(component.description) + '" placeholder="Enter / confirm manufacturing description"></td>' +
      '<td><button class="remove" data-remove-component="' + index + '" type="button">×</button></td>' +
      '</tr>';
  }).join("");

  body.querySelectorAll("[data-dxf-select]").forEach(select => {
    const row = select.closest("tr");
    const component = components[Number(row.dataset.componentIndex)];
    select.value = component.dxfIndex === "" || component.dxfIndex == null ? "" : String(component.dxfIndex);
  });
  renderSummary();
}

function render() {
  renderComponents();
  renderSelectedSchedule();
}

function loadFixture(tag) {
  const item = schedule.find(entry => entry.tag === tag);
  if (!item) {
    $("scheduleStatus").textContent = "The selected tag was not found in the schedule.";
    $("scheduleStatus").className = "error";
    return;
  }

  saveCurrentFixture();
  currentFixtureTag = item.tag;
  $("fixtureTag").value = item.tag;
  $("fixtureQuantity").value = item.qty;
  $("fixtureDescription").value = fixtureDescriptionFromSchedule(item);
  $("finish").value = item.finish;
  $("currentFixtureLabel").textContent = item.tag + " · " + item.qty + " fixture(s)";

  const saved = fixtureData[item.tag];
  bomLines = saved ? clone(saved.bomLines) : [];
  dxfFiles = saved ? clone(saved.dxfFiles) : [];
  components = saved ? clone(saved.components) : [];
  $("dxfInput").value = saved?.dxfText || "";
  $("bomStatus").textContent = bomLines.length
    ? bomLines.length + " SolidWorks BOM item(s) loaded for " + item.tag + "."
    : "No SolidWorks BOM imported for " + item.tag + ".";
  $("parseStatus").textContent = dxfFiles.length
    ? dxfFiles.length + " DXF filename(s) available for " + item.tag + "."
    : "Paste the DXF filenames for " + item.tag + ".";
  $("scheduleStatus").textContent = item.tag + " loaded. Its BOM data is kept separately from other fixtures.";
  $("scheduleStatus").className = "ok";
  render();
}

$("fixtureSelect").addEventListener("change", () => {
  $("scheduleStatus").textContent = "Click Load fixture to switch to " + $("fixtureSelect").value + ".";
  $("scheduleStatus").className = "status-text";
});

$("useFixtureBtn").addEventListener("click", () => loadFixture($("fixtureSelect").value));

$("scheduleRows").addEventListener("input", event => {
  const input = event.target.closest("[data-schedule-field]");
  if (!input) return;
  const row = schedule[Number(input.closest("tr").dataset.scheduleIndex)];
  const field = input.dataset.scheduleField;
  row[field] = field === "qty" ? Number(input.value) : input.value;
  renderFixtureOptions();
  if (row.tag === currentFixtureTag) {
    $("fixtureQuantity").value = row.qty;
    $("fixtureDescription").value = fixtureDescriptionFromSchedule(row);
    $("finish").value = row.finish;
    renderSelectedSchedule();
  }
});

$("addScheduleRowBtn").addEventListener("click", () => {
  schedule.push({
    no:schedule.length + 1, tag:"", mounting:"", height:"", profile:"",
    width:"", length:"", finish:"", qty:""
  });
  renderScheduleEditor();
  renderFixtureOptions();
  $("scheduleStatus").textContent = "New schedule row added. Enter its values, then select and load it.";
  $("scheduleStatus").className = "ok";
});

$("importBomBtn").addEventListener("click", async () => {
  const file = $("solidworksFile").files[0];
  if (!file) {
    $("bomStatus").textContent = "Choose the original SolidWorks .xlsx file first.";
    $("bomStatus").className = "error";
    return;
  }
  const button = $("importBomBtn");
  button.disabled = true;
  $("bomStatus").textContent = "Reading SolidWorks BOM…";
  $("bomStatus").className = "status-text";

  try {
    const response = await fetch("/api/import-solidworks-bom", {
      method:"POST",
      headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
      body:file
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "SolidWorks BOM import failed.");
    bomLines = data.components.map(line => ({...line, manual:false}));
    rebuildComponents();
    saveCurrentFixture();
    $("bomStatus").textContent = data.count + " items imported from worksheet '" + data.worksheet + "'.";
    $("bomStatus").className = "ok";
  } catch (error) {
    $("bomStatus").textContent = error.message;
    $("bomStatus").className = "error";
  } finally {
    button.disabled = false;
  }
});

$("parseBtn").addEventListener("click", async () => {
  const button = $("parseBtn");
  button.disabled = true;
  $("parseStatus").textContent = "Parsing DXF filenames…";
  $("parseStatus").className = "status-text";
  try {
    const response = await fetch("/api/parse-dxf-list", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({filenames:$("dxfInput").value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "DXF parsing failed.");
    dxfFiles = data.components;
    rebuildComponents();
    saveCurrentFixture();
    const unmatched = components.filter(component => component.dxfIndex === "").length;
    $("parseStatus").textContent = dxfFiles.length + " DXF file(s) parsed. " +
      unmatched + " BOM item(s) have no automatic DXF match; review the list.";
    $("parseStatus").className = unmatched ? "status-text" : "ok";
  } catch (error) {
    $("parseStatus").textContent = error.message;
    $("parseStatus").className = "error";
  } finally {
    button.disabled = false;
  }
});

$("componentRows").addEventListener("change", event => {
  const select = event.target.closest("[data-dxf-select]");
  if (!select) return;
  const index = Number(select.closest("tr").dataset.componentIndex);
  components[index].dxfIndex = select.value === "" ? "" : Number(select.value);
  saveCurrentFixture();
  renderComponents();
});

$("componentRows").addEventListener("input", event => {
  const input = event.target.closest("[data-component-field]");
  if (!input) return;
  const index = Number(input.closest("tr").dataset.componentIndex);
  components[index][input.dataset.componentField] = input.value;
  if (components[index].manual) {
    const line = bomLines.find(entry => entry.itemNo === components[index].itemNo);
    if (line) line[input.dataset.componentField] = input.value;
  }
  saveCurrentFixture();
});

$("componentRows").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-component]");
  if (!button) return;
  const index = Number(button.dataset.removeComponent);
  const removed = components[index];
  components.splice(index, 1);
  bomLines = bomLines.filter(line => line.itemNo !== removed.itemNo || line.partNumber !== removed.partNumber);
  saveCurrentFixture();
  renderComponents();
});

$("addRowBtn").addEventListener("click", () => {
  const line = {
    itemNo:String(bomLines.length + 1),
    partNumber:"",
    description:"",
    quantityPerAssembly:"",
    manual:true
  };
  bomLines.push(line);
  components.push({...line, dxfIndex:""});
  saveCurrentFixture();
  renderComponents();
});

$("generateSummaryBtn").addEventListener("click", () => {
  renderSummary();
  $("summaryStatus").textContent = schedule.length + " schedule fixture(s) displayed. BOM item counts are shown where imported.";
  $("summaryStatus").className = "ok";
});

$("exportBtn").addEventListener("click", async () => {
  const button = $("exportBtn");
  button.disabled = true;
  $("parseStatus").textContent = "Generating Excel BOM…";
  $("parseStatus").className = "status-text";

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
      components:components.map(component => ({
        itemNo:component.itemNo,
        partNumber:component.partNumber,
        quantityPerAssembly:component.quantityPerAssembly,
        description:component.description
      }))
    };

    const response = await fetch("/api/export-bom-xlsx", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Excel export failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "BOM - " + ($("projectNumber").value || $("projectName").value || "project") +
      " - " + ($("fixtureTag").value || "fixture") + ".xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    const missing = components.filter(component => !String(component.description || "").trim()).length;
    $("parseStatus").textContent = "Excel BOM generated. " +
      (missing ? missing + " description(s) are blank; review the workbook before release." : "All manufacturing descriptions are populated.");
    $("parseStatus").className = missing ? "status-text" : "ok";
  } catch (error) {
    $("parseStatus").textContent = error.message;
    $("parseStatus").className = "error";
  } finally {
    button.disabled = components.length === 0;
  }
});

const logoutButton = $("logoutBtn");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", {method:"POST"});
    window.location.replace("/login");
  });
}

renderScheduleEditor();
renderFixtureOptions();
$("fixtureSelect").value = schedule[0]?.tag || "";
loadFixture($("fixtureSelect").value);
