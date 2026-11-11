const $ = id => document.getElementById(id);

let components = [];
let bomLines = [];
let dxfFiles = [];
let currentFixtureTag = "";
let drawingText = "";
const fixtureData = {};
let templateAssets = { stellarLogo: "", radioButton: "" };
let selectedFixtureFolderEntries = null;
let selectedFixtureFolderName = "";


function makeBomFilename() {
  const clean = value => String(value || "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim();
  const selected = schedule.find(item => item.tag === $("fixtureTag").value);
  const po = clean($("poNumber").value) || "TBD";
  const scheduleRow = selected ? selected.no : "";
  const tag = clean($("fixtureTag").value) || "Fixture";
  const description = clean($("bomFilenameDescription").value);
  return "BOM - PO " + po + (scheduleRow ? "(" + scheduleRow + ")" : "") + " - " +
    tag + (description ? " " + description : "") + ".xlsx";
}

const schedule = [
  {no:1,tag:"T01A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:2},
  {no:2,tag:"T01B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:3},
  {no:3,tag:"T01C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:2},
  {no:4,tag:"T02A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:4},
  {no:5,tag:"T02B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:3},
  {no:6,tag:"T03A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:4},
  {no:7,tag:"T03B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:2},
  {no:8,tag:"T03C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:1},
  {no:9,tag:"T04A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:4},
  {no:10,tag:"T04B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:3},
  {no:11,tag:"T05A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:1},
  {no:12,tag:"T05B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:2},
  {no:13,tag:"T06",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'110"',finish:"M-12 EA",qty:1},
  {no:14,tag:"T07",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'307"',finish:"M-12 EA",qty:1},
  {no:15,tag:"T08",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'191"',length:'221"',finish:"M-12 EA",qty:1},
  {no:16,tag:"T09A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:1},
  {no:17,tag:"T09B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:1},
  {no:18,tag:"T10",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'221"',length:'136"',finish:"M-12 EA",qty:1},
  {no:19,tag:"T11",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'177"',length:'221"',finish:"M-12 EA",qty:1},
  {no:20,tag:"T12",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'158"',length:'206"',finish:"M-12 EA",qty:1},
  {no:21,tag:"T13A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:22,tag:"T13B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:23,tag:"T13C",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:24,tag:"T14",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'154"',length:'206"',finish:"M-12 EA",qty:1},
  {no:25,tag:"T15",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'479"',finish:"M-12 EA",qty:1},
  {no:26,tag:"T16",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'203"',finish:"M-12 EA",qty:2},
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

function normalizePartTokens(value, fixtureTag) {
  let text = String(value || "").toUpperCase().trim();
  if (fixtureTag && text.startsWith(fixtureTag.toUpperCase())) {
    text = text.slice(fixtureTag.length);
  }
  text = text.replace(/REMOVABLE[\s_-]*GUSSET/g, "GUS");
  text = text.replace(/\bTROUGH\b/g, "");
  return text
    .split(/[^A-Z0-9]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function matchDxfIndex(partNumber, files, fixtureTag) {
  const target = normalizePart(partNumber, fixtureTag);
  const targetTokens = normalizePartTokens(partNumber, fixtureTag);
  if (!target || !targetTokens.length) return "";

  let bestIndex = -1;
  let bestScore = 0;

  files.forEach((file, index) => {
    const candidate = normalizePart(file.componentLabel, fixtureTag);
    const candidateTokens = normalizePartTokens(file.componentLabel, fixtureTag);
    if (!candidate || !candidateTokens.length) return;

    let score = 0;

    // Exact normalized identity remains the strongest match.
    if (candidate === target) {
      score = 100;
    // A BOM part such as T01A-A must match the first meaningful DXF suffix
    // token A, not a different token such as ANG from "ANG 1".
    } else if (
      candidateTokens.length >= targetTokens.length &&
      targetTokens.every((token, tokenIndex) => candidateTokens[tokenIndex] === token)
    ) {
      score = 95;
    // Preserve useful legacy matching for multi-token names, but only after
    // token-prefix matching has been considered.
    } else if (candidate.startsWith(target) || target.startsWith(candidate)) {
      score = 70;
    } else if (candidate.includes(target) || target.includes(candidate)) {
      score = 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 70 ? bestIndex : "";
}
function makeDraftDescription(partNumber, dxf) {
  if (!dxf) return "";
  const label = String(dxf.componentLabel || partNumber || "").toUpperCase();
  let componentType = "";

  if (/SHORT[\s_-]*ANG/.test(label) || /SHORT[\s_-]*ANG/.test(String(partNumber).toUpperCase())) {
    componentType = "Short angle";
  } else if (/\bANG(?:LE)?\b/.test(label) || /\bANG(?:LE)?\b/.test(String(partNumber).toUpperCase())) {
    componentType = "Angle";
  } else if (/TROUGH/.test(label)) {
    componentType = "Trough section";
  } else if (/END[\s_-]*CAP/.test(label) || /END[\s_-]*CAP/.test(String(partNumber).toUpperCase())) {
    componentType = "End cap";
  } else if (/GUS/.test(label) || /GUSSET/.test(String(partNumber).toUpperCase())) {
    componentType = "Gusset";
  } else if (/SPLICE[\s_-]*PLT/.test(label) || /SPLICE[\s_-]*PLT/.test(String(partNumber).toUpperCase())) {
    componentType = "Splice plate";
  } else {
    componentType = label.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!componentType) return "";
  const part = String(partNumber || "").trim();
  const dimensions = dxf.flatWidth && dxf.flatHeight
    ? "Flat pattern " + dxf.flatWidth + " × " + dxf.flatHeight + " in"
    : "";
  const material = dxf.materialCode ? "Material code " + dxf.materialCode : "";
  return [componentType + (part ? " " + part : ""), dimensions, material]
    .filter(Boolean).join(" — ");
}


const MANUFACTURING_FIELDS = [["componentType","Component type","select"],["materialCode","Material code","text"],["cuttingListIdentity","Approved common DXF identity / filename","text"],["materialGrade","Material / grade","text"],["gauge","Thickness / gauge","text"],["cuttingListFinish","Laser order finish (optional)","text"],["crossSectionDimensions","Cross-section dimensions","text"],["geometryDimensions","Geometry dimensions","text"],["profileType","Profile type","text"],["additionalDimensions","Additional dimensions","text"],["overallLength","Overall finished length","text"],["plateLength","Plate length","text"],["plateWidth","Plate width","text"],["flatPatternWidth","Flat-pattern width","text"],["flatPatternHeight","Flat-pattern height","text"],["manufacturingProcess","Manufacturing process","text"],["partIdentification","Part identification on drawing","text"],["pieceCount","Number of fabricated pieces","text"],["pieceLengths","Individual piece lengths (comma or / separated)","text"],["hardwareSize","Hardware size","text"],["hardwareType","Hardware type / specification","text"],["hardwareLength","Hardware length","text"],["drawingReference","Drawing / detail reference","text"],["manufacturingNotes","Manufacturing notes","text"]];

function engineeringExample(key, component) {
  const part = String(component.partNumber || "").toUpperCase();
  const matchedDxf = component.dxfIndex === "" || component.dxfIndex == null
    ? null : dxfFiles[Number(component.dxfIndex)];
  const identity = part + " " + String(matchedDxf?.componentLabel || "").toUpperCase();
  const isChannel = /TROUGH|CHANNEL|CHN/.test(identity);
  const isAngle = /ANG/.test(identity);
  const isPlate = /ENDCAP|SPLICE|PLT/.test(identity);
  const isGusset = /GUS/.test(identity);
  const examples = {
    cuttingListIdentity: "Use the same approved common DXF filename/key only when source DXFs are confirmed identical.",
    componentType: isChannel ? "Suggested type: Channel — verify" : isAngle ? "Suggested type: Angle — verify" : isPlate ? "Suggested type: Plate — verify" : isGusset ? "Suggested type: Gusset — verify" : "Select the type shown on the drawing",
    materialCode: "e.g. C11 or C16 (DXF token only)",
    cuttingListIdentity: "Optional: enter the same approved common DXF filename/key only when different fixture DXFs are confirmed identical.",
    materialGrade: "Enter the full material callout from the drawing",
    gauge: "e.g. 16GA. or 11GA. — verify on drawing",
    cuttingListFinish: "Leave blank unless the laser order line has a specific finish.",
    crossSectionDimensions: isAngle ? 'e.g. 1" x 1 3/8"' : 'e.g. 7 11/16" x 9" x 7 11/16"',
    geometryDimensions: 'e.g. 1 3/4" x 8 13/16" x 1 3/4"',
    profileType: "e.g. Chn'l",
    additionalDimensions: 'e.g. 6 1/16" & 1 3/4"',
    overallLength: isAngle ? 'e.g. 78 7/8" or 11 3/4"' : 'e.g. 77 7/16" or 141 7/8"',
    plateLength: isPlate ? 'e.g. 7 11/16"' : 'e.g. 2"',
    plateWidth: isPlate ? 'e.g. 9"' : 'e.g. 8"',
    flatPatternWidth: "Copied from matched DXF when available",
    flatPatternHeight: "Copied from matched DXF when available",
    manufacturingProcess: isPlate ? "e.g. Laser" : "e.g. Laser/SM — confirm process",
    partIdentification: "e.g. T02-A, T02-ANG-L/H or ENDCAP",
    pieceCount: "e.g. 2 (only if made in multiple pieces)",
    pieceLengths: "e.g. 99.9375 / 41.9375 (inches)",
    hardwareSize: "e.g. #8",
    hardwareType: "e.g. RH Tek Screw",
    hardwareLength: 'e.g. 1/2"',
    drawingReference: "e.g. sheet / detail / drawing number",
    manufacturingNotes: "e.g. return, orientation, weld or assembly note"
  };
  return examples[key] || "Enter verified drawing value";
}

function renderManufacturingFields(component, index) {
  const typeOptions = ["", "Channel", "Angle", "Plate", "Gusset", "Purchased hardware", "Other"];
  return '<tr class="engineering-row" data-component-index="' + index + '"><td colspan="8"><details class="engineering-details"><summary>Manufacturing data — enter or verify engineering values</summary>' +
    '<p class="engineering-guidance">Examples are prompts only, based on the earlier BOM format. Enter values from the current fixture drawing; do not copy an example unless it applies.</p>' +
    '<div class="engineering-grid">' + MANUFACTURING_FIELDS.map(([key, label, kind]) => {
      const value = component[key] ?? "";
      if (key === "componentType") return '<label>' + label + '<select class="engineering-input" data-component-field="' + key + '">' + typeOptions.map(option => '<option value="' + esc(option) + '"' + (value === option ? ' selected' : '') + '>' + esc(option || 'Select type') + '</option>').join("") + '</select><small class="field-example">' + esc(engineeringExample(key, component)) + '</small></label>';
      return '<label>' + label + '<input class="engineering-input" type="text" data-component-field="' + key + '" value="' + esc(value) + '" placeholder="' + esc(engineeringExample(key, component)) + '"><small class="field-example">' + esc(engineeringExample(key, component)) + '</small></label>';
    }).join("") + '</div>' +
    '<div class="engineering-actions"><button type="button" class="secondary" data-generate-description="' + index + '">Build BOM description from these fields</button><span>Only entered values are used; confirm the description before release.</span></div>' +
    '</details></td></tr>';
}

function rebuildComponents() {
  components = bomLines.map(line => {
    const dxfIndex = matchDxfIndex(line.partNumber, dxfFiles, currentFixtureTag);
    let description = String(line.description || "").trim();
    let descriptionDraft = Boolean(line.descriptionDraft);

    // Auto-generated descriptions are derived from the DXF match. If the
    // match changes, refresh an existing auto-draft so a previous incorrect
    // association cannot survive into the exported BOM. Manual descriptions
    // (descriptionDraft === false) are preserved.
    if (dxfIndex !== "" && (!description || descriptionDraft)) {
      description = makeDraftDescription(line.partNumber, dxfFiles[Number(dxfIndex)]);
      descriptionDraft = Boolean(description);
      if (descriptionDraft) {
        line.description = description;
        line.descriptionDraft = true;
      }
    }

    const matchedDxf = dxfIndex === "" ? null : dxfFiles[Number(dxfIndex)];
    return {
      ...clone(line),
      itemNo: line.itemNo,
      partNumber: line.partNumber,
      quantityPerAssembly: line.quantityPerAssembly,
      description,
      descriptionDraft,
      dxfIndex,
      materialCode: line.materialCode || matchedDxf?.materialCode || "",
      flatPatternWidth: line.flatPatternWidth || matchedDxf?.flatWidth || "",
      flatPatternHeight: line.flatPatternHeight || matchedDxf?.flatHeight || "",
      manual: Boolean(line.manual)
    };
  });
  render();
}

function saveCurrentFixture() {
  if (!currentFixtureTag) return;
  fixtureData[currentFixtureTag] = {
    bomLines: clone(bomLines),
    dxfFiles: clone(dxfFiles),
    components: clone(components),
    dxfText: $("dxfInput").value,
    finishDescription: $("finishDescription").value,
    bomFilenameDescription: $("bomFilenameDescription").value,
    sourceFiles: clone(fixtureData[currentFixtureTag]?.sourceFiles || {}),
    drawingText: drawingText || fixtureData[currentFixtureTag]?.drawingText || "",
    bomGenerated: Boolean(fixtureData[currentFixtureTag]?.bomGenerated),
    generatedAt: fixtureData[currentFixtureTag]?.generatedAt || "",
    includeInLaser: fixtureData[currentFixtureTag]?.includeInLaser !== false
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
  const generated = schedule.filter(item => fixtureData[item.tag]?.bomGenerated);
  $("summaryRows").innerHTML = generated.length ? generated.map(item => {
    const saved = fixtureData[item.tag];
    const count = saved?.components?.length || 0;
    const include = saved?.includeInLaser !== false;
    return '<tr><td>' + esc(item.no) + '</td><td>' + esc(item.tag) + '</td><td>' +
      esc(item.mounting) + '</td><td>' + esc(item.profile) + '</td><td>' +
      esc(item.width) + '</td><td>' + esc(item.length) + '</td><td>' +
      esc(item.finish) + '</td><td>' + esc(item.qty) + '</td><td>' +
      esc(count) + '</td><td><span class="summary-check" title="BOM Excel generated">✓</span></td>' +
      '<td><input type="checkbox" data-laser-include="' + esc(item.tag) + '"' + (include ? ' checked' : '') +
      ' aria-label="Include ' + esc(item.tag) + ' in Laser Order Request"></td></tr>';
  }).join("") : '<tr><td colspan="11" class="empty">No fixture BOM has been generated yet.</td></tr>';
  updateLaserOrderButtonState();
}

function updateLaserOrderButtonState() {
  const hasSelectedGeneratedBom = schedule.some(item => {
    const saved = fixtureData[item.tag];
    return saved?.bomGenerated && saved.includeInLaser !== false && Array.isArray(saved.components) && saved.components.length > 0;
  });
  $("exportCuttingListBtn").disabled = !hasSelectedGeneratedBom;
}

function renderComponents() {
  $("rowCount").textContent = components.length + " BOM item" + (components.length === 1 ? "" : "s");
  $("exportBtn").disabled = components.length === 0;
  const body = $("componentRows");

  if (!components.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Read a fixture folder and build the BOM Component Tree View to begin.</td></tr>';
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
      '<td><input class="cell description-cell" data-component-field="description" value="' + esc(component.description) + '" placeholder="Enter / confirm manufacturing description">' +
        (component.descriptionDraft ? '<span class="match-note">Auto-draft from DXF filename — verify and edit before release.</span>' : '') + '</td>' +
      '<td><button class="remove" data-remove-component="' + index + '" type="button">×</button></td>' +
      '</tr>' + renderManufacturingFields(component, index);
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
  $("finishDescription").value = fixtureData[item.tag]?.finishDescription || "";
  $("bomFilenameDescription").value = fixtureData[item.tag]?.bomFilenameDescription || item.mounting || "";
  $("currentFixtureLabel").textContent = item.tag + " · " + item.qty + " fixture(s)";

  const saved = fixtureData[item.tag];
  const source = saved?.sourceFiles;
  $("fixtureSourcePaths").textContent = source
    ? "Sources: PDF " + source.drawingPdf + " · BOM " + source.solidworksBom + " · DXF " + source.dxfFolder + " (" + (source.dxfFilenames?.length || 0) + " filenames)."
    : "Source references: drawing PDF —; SolidWorks BOM —; DXF folder —.";
  if ($("fixtureFolderStatus")) {
    $("fixtureFolderStatus").textContent = source ? "Previously imported source folder: " + source.fixtureFolder : "Select the current fixture folder.";
    $("fixtureFolderStatus").className = source ? "ok" : "status-text";
  }
  bomLines = saved ? clone(saved.bomLines) : [];
  dxfFiles = saved ? clone(saved.dxfFiles) : [];
  components = saved ? clone(saved.components) : [];
  drawingText = saved?.drawingText || "";
  $("dxfInput").value = saved?.dxfText || "";
  if ($("drawingTextPreview")) $("drawingTextPreview").value = drawingText;
  if ($("drawingTextDetails")) $("drawingTextDetails").hidden = !drawingText;
  if ($("dxfFilenamePreview")) $("dxfFilenamePreview").value = saved?.sourceFiles?.dxfFilenames?.map(path => path.split("/").pop()).join("\n") || "";
  if ($("dxfFilenameDetails")) $("dxfFilenameDetails").hidden = !saved?.sourceFiles?.dxfFilenames?.length;
  if ($("componentTreePanel")) $("componentTreePanel").hidden = true;
  if ($("buildComponentTreeBtn")) $("buildComponentTreeBtn").disabled = !(bomLines.length && dxfFiles.length);
  $("bomStatus").textContent = bomLines.length
    ? bomLines.length + " SolidWorks BOM item(s) loaded for " + item.tag + "."
    : "No SolidWorks BOM imported for " + item.tag + ".";
  $("parseStatus").textContent = dxfFiles.length
    ? dxfFiles.length + " DXF filename(s) available for " + item.tag + "."
    : "Read the " + item.tag + " fixture folder to discover DXF filenames.";
  $("scheduleStatus").textContent = item.tag + " loaded. Its BOM data is kept separately from other fixtures.";
  $("scheduleStatus").className = "ok";
  render();
}


$("bomFilenameDescription").addEventListener("input", saveCurrentFixture);

async function loadTemplateAssets() {
  try {
    const response = await fetch("/api/template-assets");
    if (!response.ok) throw new Error("Could not load saved images.");
    templateAssets = await response.json();
    updateBrandingStatus("stellarLogo", "Stellar logo");
    updateBrandingStatus("radioButton", "Radio-button graphic");
  } catch (error) {
    ["stellarLogo", "radioButton"].forEach(key => {
      const status = $(key + "Status");
      status.textContent = "Could not load saved image settings from the server.";
      status.className = "error";
    });
  }
}

function updateBrandingStatus(assetName, label) {
  const status = $(assetName + "Status");
  if (templateAssets[assetName]) {
    status.textContent = label + " is saved on the application server and will be included in every BOM.";
    status.className = "ok";
  } else {
    status.textContent = "No " + label.toLowerCase() + " saved yet. Upload it once for all BOM exports.";
    status.className = "status-text";
  }
}

function bindBrandingUpload(assetName, label) {
  const input = $(assetName + "File");
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const status = $(assetName + "Status");
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      status.textContent = "Unsupported image. Please choose a PNG or JPEG file.";
      status.className = "error";
      input.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      status.textContent = label + " is too large. Maximum size is 2 MB.";
      status.className = "error";
      input.value = "";
      return;
    }
    status.textContent = "Saving " + label.toLowerCase() + " on the application server…";
    status.className = "status-text";
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read this image file."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/template-assets/" + assetName, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this image.");
      templateAssets[assetName] = dataUrl;
      updateBrandingStatus(assetName, label);
    } catch (error) {
      status.textContent = error.message;
      status.className = "error";
    } finally {
      input.value = "";
    }
  });
}

bindBrandingUpload("stellarLogo", "Stellar logo");
bindBrandingUpload("radioButton", "Radio-button graphic");
loadTemplateAssets();

$("fixtureSelect").addEventListener("change", () => {
  $("scheduleStatus").textContent = "Click Load fixture to switch to " + $("fixtureSelect").value + ".";
  $("scheduleStatus").className = "status-text";
});

$("useFixtureBtn").addEventListener("click", () => loadFixture($("fixtureSelect").value));

$("fixtureQuantity").addEventListener("input", event => {
  if (!currentFixtureTag) return;
  const item = schedule.find(entry => entry.tag === currentFixtureTag);
  if (!item) return;
  const value = Number(event.target.value);
  if (!Number.isFinite(value) || value < 0) return;
  item.qty = value;
  $("currentFixtureLabel").textContent = item.tag + " · " + item.qty + " fixture(s)";
  renderSelectedSchedule();
});

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
    if (!fixtureData[row.tag]?.bomFilenameDescription) $("bomFilenameDescription").value = row.mounting || "";
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
    $("bomStatus").textContent = "Choose the original SolidWorks .xls or .xlsx file first.";
    $("bomStatus").className = "error";
    return;
  }
  const extension = file.name.split(".").pop().toLowerCase();
  if (!["xls", "xlsx"].includes(extension)) {
    $("bomStatus").textContent = "Unsupported file type. Choose an .xls or .xlsx workbook.";
    $("bomStatus").className = "error";
    return;
  }

  const button = $("importBomBtn");
  button.disabled = true;
  $("bomStatus").textContent = "Reading SolidWorks BOM (" + extension.toUpperCase() + ")…";
  $("bomStatus").className = "status-text";

  try {
    const response = await fetch("/api/import-solidworks-bom", {
      method:"POST",
      headers:{"Content-Type":"application/octet-stream"},
      body:file
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "SolidWorks BOM import failed.");
    bomLines = data.components.map(line => ({...line, manual:false}));
    rebuildComponents();
    saveCurrentFixture();
    $("bomStatus").textContent = data.count + " items imported from '" + data.worksheet +
      "' (" + extension.toUpperCase() + ").";
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

async function extractDrawingPdfText(pdfFile) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await pdfFile.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let text = "";
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str || "").join(" ");
    text += "\n\n--- PAGE " + pageNo + " ---\n" + pageText;
  }
  return { text: text.trim(), pageCount: pdf.numPages };
}

async function readSelectedDirectory(handle) {
  const rootName = handle.name;
  const entries = [];
  for await (const [name, child] of handle.entries()) {
    if (child.kind === "file") {
      entries.push({ file: await child.getFile(), path: rootName + "/" + name });
      continue;
    }
    if (child.kind === "directory" && name.toUpperCase() === "DXF") {
      entries.push({ file: null, path: rootName + "/" + name + "/" });
      if (name !== "DXF") continue;
      for await (const [dxfName, dxfHandle] of child.entries()) {
        if (dxfHandle.kind === "file") {
          entries.push({ file: await dxfHandle.getFile(), path: rootName + "/DXF/" + dxfName });
        }
      }
    }
  }
  return entries;
}

$("chooseFixtureFolderBtn").addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    $("fixtureFolderInput").click();
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    selectedFixtureFolderEntries = await readSelectedDirectory(handle);
    selectedFixtureFolderName = handle.name;
    $("fixtureFolderStatus").textContent = "Selected folder: " + handle.name + " (" +
      selectedFixtureFolderEntries.filter(entry => entry.file).length + " files discovered locally).";
    $("fixtureFolderStatus").className = "status-text";
  } catch (error) {
    if (error.name !== "AbortError") {
      $("fixtureFolderStatus").textContent = "Could not read the selected folder: " + error.message;
      $("fixtureFolderStatus").className = "error";
    }
  }
});

$("fixtureFolderInput").addEventListener("change", () => {
  selectedFixtureFolderEntries = null;
  selectedFixtureFolderName = "";
  const files = Array.from($("fixtureFolderInput").files || []);
  $("fixtureFolderStatus").textContent = files.length
    ? "Selected folder: " + (files[0].webkitRelativePath || files[0].name).split("/")[0] + " (" + files.length + " files)."
    : "Select the current fixture folder.";
  $("fixtureFolderStatus").className = "status-text";
});

async function importFixtureFolder() {
  const selected = selectedFixtureFolderEntries || Array.from($("fixtureFolderInput").files || []);
  const tag = $("fixtureSelect").value;
  const status = $("fixtureFolderStatus");
  const button = $("importFixtureFolderBtn");
  if (!selected.length) throw new Error("Select the fixture folder first.");
  if (!tag) throw new Error("Select a fixture tag from the project schedule.");
  const entries = selected.map(entry => entry && entry.path
    ? entry
    : ({ file: entry, path: String(entry.webkitRelativePath || entry.name).replace(/\\/g, "/") }));
  const roots = [...new Set(entries.map(entry => entry.path.split("/")[0]))];
  if (roots.length !== 1 || roots[0] !== tag) {
    throw new Error("The selected folder must be named exactly " + tag + " (uppercase, matching the schedule). Found: " + roots.join(", "));
  }
  const bomCandidates = entries.filter(entry => entry.path === tag + "/" + tag + ".xls" || entry.path === tag + "/" + tag + ".xlsx");
  if (bomCandidates.length !== 1) throw new Error("Expected exactly one " + tag + ".xls or " + tag + ".xlsx directly inside the fixture folder.");
  const pdfCandidates = entries.filter(entry => entry.path === tag + "/" + tag + ".pdf");
  if (pdfCandidates.length !== 1) throw new Error("Expected drawing file " + tag + ".pdf directly inside the fixture folder.");
  if (entries.some(entry => {
    const folderName = entry.path.split("/")[1];
    return folderName && folderName.toUpperCase() === "DXF" && folderName !== "DXF";
  })) throw new Error("The DXF subfolder must be named exactly DXF in uppercase.");
  const dxfEntries = entries.filter(entry => {
    const parts = entry.path.split("/");
    return parts.length === 3 && parts[0] === tag && parts[1] === "DXF" && /\.dxf$/i.test(parts[2]);
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (!dxfEntries.length) throw new Error("No DXF files found. Expected files directly inside " + tag + "/DXF/.");
  button.disabled = true;
  status.textContent = "Reading the SolidWorks BOM and discovering DXF filenames…";
  status.className = "status-text";
  $("buildComponentTreeBtn").disabled = true;
  try {
    const bomFile = bomCandidates[0].file;
    const bomResponse = await fetch("/api/import-solidworks-bom", {
      method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: bomFile
    });
    const bomResult = await bomResponse.json();
    if (!bomResponse.ok) throw new Error(bomResult.error || "SolidWorks BOM import failed.");
    const dxfNames = dxfEntries.map(entry => entry.path.split("/").pop());
    let dxfHashes = [];
    let hashWarning = "";
    if (window.crypto?.subtle) {
      try {
        dxfHashes = await Promise.all(dxfEntries.map(async entry => {
          const bytes = await entry.file.arrayBuffer();
          const digest = await window.crypto.subtle.digest("SHA-256", bytes);
          return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        }));
      } catch (error) {
        hashWarning = " DXF fingerprinting was unavailable (" + error.message + "); common-part detection will rely on explicit identities only.";
      }
    } else {
      hashWarning = " Secure browser hashing is unavailable; common-part detection will rely on explicit identities only.";
    }
    const dxfResponse = await fetch("/api/parse-dxf-list", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filenames: dxfNames.join("\n") })
    });
    const dxfResult = await dxfResponse.json();
    if (!dxfResponse.ok) throw new Error(dxfResult.error || "DXF filename parsing failed.");
    let pdfResult = { text: "", pageCount: 0 };
    let pdfWarning = "";
    try { pdfResult = await extractDrawingPdfText(pdfCandidates[0].file); }
    catch (error) { pdfWarning = " PDF text extraction was unavailable (" + error.message + "); the drawing remains identified as a source reference."; }
    loadFixture(tag);
    bomLines = bomResult.components.map(line => ({ ...line, manual: false }));
    dxfFiles = dxfResult.components.map((component, index) => ({ ...component, sha256: dxfHashes[index] || "" }));
    drawingText = pdfResult.text;
    $("dxfInput").value = dxfNames.join("\n");
    rebuildComponents();
    fixtureData[tag].bomGenerated = false;
    fixtureData[tag].generatedAt = "";
    fixtureData[tag].includeInLaser = true;
    fixtureData[tag].sourceFiles = {
      fixtureFolder: tag, drawingPdf: pdfCandidates[0].path,
      solidworksBom: bomCandidates[0].path, dxfFolder: tag + "/DXF/",
      dxfFilenames: dxfEntries.map(entry => entry.path)
    };
    fixtureData[tag].drawingText = drawingText;
    saveCurrentFixture();
    $("bomStatus").textContent = bomResult.count + " BOM item(s) read from " + bomCandidates[0].path + ".";
    $("bomStatus").className = "ok";
    $("parseStatus").textContent = dxfFiles.length + " DXF filenames read from " + tag + "/DXF/. DXF file contents were not uploaded.";
    $("parseStatus").className = "ok";
    $("fixtureSourcePaths").textContent = "Sources: PDF " + pdfCandidates[0].path + " · BOM " + bomCandidates[0].path + " · DXF " + tag + "/DXF/ (" + dxfEntries.length + " filenames).";
    $("dxfFilenamePreview").value = dxfNames.join("\n");
    $("dxfFilenameDetails").hidden = false;
    $("drawingTextPreview").value = drawingText || "No extractable text layer was found. The PDF remains available as a local source file during this folder selection.";
    $("drawingTextDetails").hidden = false;
    status.textContent = "Folder validated. BOM: " + bomResult.count + " rows; DXF filenames: " + dxfEntries.length + "; PDF pages: " + (pdfResult.pageCount || "not extracted") + "." + pdfWarning + hashWarning;
    status.className = pdfWarning ? "status-text" : "ok";
    const unmatchedCount = components.filter(component => component.dxfIndex === "").length;
    $("folderImportReview").textContent = "Source files have been read. " + (components.length - unmatchedCount) +
      " BOM item(s) matched automatically; " + unmatchedCount + " remain unmatched for review. Click Build BOM Component Tree View.";
    $("buildComponentTreeBtn").disabled = false;
    $("componentTreePanel").hidden = true;
    renderSummary();
    selectedFixtureFolderEntries = null;
    selectedFixtureFolderName = "";
    $("fixtureFolderInput").value = "";
  } finally {
    button.disabled = false;
  }
}

$("importFixtureFolderBtn").addEventListener("click", async () => {
  try { await importFixtureFolder(); }
  catch (error) {
    $("fixtureFolderStatus").textContent = error.message;
    $("fixtureFolderStatus").className = "error";
  }
});

$("buildComponentTreeBtn").addEventListener("click", () => {
  if (!components.length) return;
  $("componentTreePanel").hidden = false;
  renderComponents();
  $("folderImportReview").textContent = "BOM Component Tree View is ready. Verify all matches and engineering data before generating the Excel BOM.";
  $("folderImportReview").className = "ok";
  $("componentTreePanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("summaryRows").addEventListener("change", event => {
  const checkbox = event.target.closest("[data-laser-include]");
  if (!checkbox) return;
  const tag = checkbox.dataset.laserInclude;
  if (!fixtureData[tag]) return;
  fixtureData[tag].includeInLaser = checkbox.checked;
  $("summaryStatus").textContent = tag + (checkbox.checked ? " included in" : " excluded from") + " the next Laser Order Request preview.";
  $("summaryStatus").className = "ok";
  if (cuttingListPreview.length) {
    try { renderCuttingListPreview(); }
    catch (error) {
      $("cuttingListStatus").textContent = error.message;
      $("cuttingListStatus").className = "error";
      $("exportCuttingListBtn").disabled = true;
    }
  } else {
    updateLaserOrderButtonState();
  }
});

$("componentRows").addEventListener("change", event => {
  const select = event.target.closest("[data-dxf-select]");
  if (!select) return;
  const index = Number(select.closest("tr").dataset.componentIndex);
  components[index].dxfIndex = select.value === "" ? "" : Number(select.value);
  if (components[index].dxfIndex !== "") {
    const selectedDxf = dxfFiles[components[index].dxfIndex];
    if (!components[index].flatPatternWidth) components[index].flatPatternWidth = selectedDxf.flatWidth || "";
    if (!components[index].flatPatternHeight) components[index].flatPatternHeight = selectedDxf.flatHeight || "";
    if (!components[index].materialCode) components[index].materialCode = selectedDxf.materialCode || "";
  }
  if (components[index].dxfIndex !== "" && (
    !String(components[index].description || "").trim() ||
    components[index].descriptionDraft
  )) {
    const draft = makeDraftDescription(components[index].partNumber, dxfFiles[components[index].dxfIndex]);
    if (draft) {
      components[index].description = draft;
      components[index].descriptionDraft = true;
      const line = bomLines.find(entry => entry.itemNo === components[index].itemNo && entry.partNumber === components[index].partNumber);
      if (line) {
        line.description = draft;
        line.descriptionDraft = true;
      }
    }
  }
  saveCurrentFixture();
  renderComponents();
});

$("componentRows").addEventListener("input", event => {
  const input = event.target.closest("[data-component-field]");
  if (!input) return;
  const index = Number(input.closest("tr").dataset.componentIndex);
  components[index][input.dataset.componentField] = input.value;
  if (input.dataset.componentField === "description") {
    components[index].descriptionDraft = false;
  }
  const line = bomLines.find(entry =>
    entry.itemNo === components[index].itemNo && entry.partNumber === components[index].partNumber
  );
  if (line) {
    line[input.dataset.componentField] = input.value;
    if (input.dataset.componentField === "description") line.descriptionDraft = false;
  }
  saveCurrentFixture();
});

$("componentRows").addEventListener("click", event => {
  const buildButton = event.target.closest("[data-generate-description]");
  if (buildButton) {
    const index = Number(buildButton.dataset.generateDescription);
    const component = components[index];
    const value = key => String(component[key] ?? "").trim();
    const type = value("componentType");
    const gauge = value("gauge");
    const process = value("manufacturingProcess");
    const partId = value("partIdentification") || value("partNumber");
    let description = "";
    if (type === "Channel") {
      description = [value("crossSectionDimensions"), gauge, "Chn'l", value("overallLength") ? "x " + value("overallLength") : "", process ? "(" + process + ")" : "", partId ? '"' + partId + '"' : "", value("pieceCount") ? "(Made in " + value("pieceCount") + "pcs.)" : "", value("pieceLengths") ? "(" + value("pieceLengths") + ")" : ""].filter(Boolean).join(" ");
    } else if (type === "Angle") {
      description = [value("crossSectionDimensions"), gauge, "Angle", value("overallLength") ? "x " + value("overallLength") : "", process ? "(" + process + ")" : "", partId ? '"' + partId + '"' : "", value("pieceCount") ? "(Made in " + value("pieceCount") + "pcs.)" : "", value("pieceLengths") ? "(" + value("pieceLengths") + ")" : ""].filter(Boolean).join(" ");
    } else if (type === "Plate") {
      description = [value("plateLength"), value("plateWidth") ? "x " + value("plateWidth") : "", gauge, "Plt.", process ? "(" + process + ")" : "", partId ? '"' + partId + '"' : ""].filter(Boolean).join(" ");
    } else if (type === "Gusset") {
      description = [value("geometryDimensions"), gauge, value("profileType"), value("additionalDimensions") ? "x " + value("additionalDimensions") : "", "Return Gusset", process ? "(" + process + ")" : ""].filter(Boolean).join(" ");
    } else if (type === "Purchased hardware") {
      description = [value("hardwareSize"), value("hardwareType"), value("hardwareLength") ? "x " + value("hardwareLength") : ""].filter(Boolean).join(" ");
    } else {
      description = [value("geometryDimensions"), gauge, type, value("overallLength"), process, partId].filter(Boolean).join(" — ");
    }
    if (!description.trim()) {
      $("parseStatus").textContent = "Enter applicable manufacturing fields before building the description.";
      $("parseStatus").className = "error";
      return;
    }
    component.description = description;
    component.descriptionDraft = false;
    const line = bomLines.find(entry => entry.itemNo === component.itemNo && entry.partNumber === component.partNumber);
    if (line) { line.description = description; line.descriptionDraft = false; }
    saveCurrentFixture();
    renderComponents();
    $("parseStatus").textContent = "Description built for " + (component.partNumber || "component") + ". Review it before export.";
    $("parseStatus").className = "ok";
    return;
  }
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
  saveCurrentFixture();
  renderSummary();
  const count = schedule.filter(item => fixtureData[item.tag]?.bomGenerated).length;
  $("summaryStatus").textContent = count + " generated fixture BOM(s) listed. Use the checkboxes to choose which ones feed the Laser Order Request.";
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
      scheduleRowNumber:(schedule.find(item => item.tag === $("fixtureTag").value) || {}).no || "",
      fixtureQuantity:$("fixtureQuantity").value,
      fixtureDescription:$("fixtureDescription").value,
      finish:[$("finish").value, $("finishDescription").value].filter(Boolean).join(" = "),
      bomFilenameDescription:$("bomFilenameDescription").value,
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
    anchor.download = makeBomFilename();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    const missing = components.filter(component => !String(component.description || "").trim()).length;
    fixtureData[currentFixtureTag] = fixtureData[currentFixtureTag] || {};
    fixtureData[currentFixtureTag].bomGenerated = true;
    fixtureData[currentFixtureTag].generatedAt = new Date().toISOString();
    fixtureData[currentFixtureTag].includeInLaser = fixtureData[currentFixtureTag].includeInLaser !== false;
    saveCurrentFixture();
    renderSummary();
    $("summaryStatus").textContent = currentFixtureTag + " BOM Excel generated and marked complete.";
    $("summaryStatus").className = "ok";
    $("parseStatus").textContent = "Excel BOM generated. " +
      (missing ? missing + " description(s) are blank; review the workbook before release." : "All manufacturing descriptions are populated.");
    $("parseStatus").className = missing ? "status-text" : "ok";
    $("folderImportReview").textContent = currentFixtureTag + " BOM Excel file generated successfully." +
      (missing ? " " + missing + " description(s) remain blank and need review." : "");
    $("folderImportReview").className = missing ? "status-text" : "ok";
  } catch (error) {
    $("parseStatus").textContent = error.message;
    $("parseStatus").className = "error";
    $("folderImportReview").textContent = "BOM Excel generation failed: " + error.message;
    $("folderImportReview").className = "error";
  } finally {
    button.disabled = components.length === 0;
  }
});


function collectProjectBomData() {
  saveCurrentFixture();
  const fixtures = [];
  for (const item of schedule) {
    const saved = fixtureData[item.tag];
    if (!saved || !saved.bomGenerated || saved.includeInLaser === false || !Array.isArray(saved.components) || !saved.components.length) continue;
    fixtures.push({
      fixtureTag: item.tag,
      fixtureQuantity: item.qty,
      finish: item.finish,
      mountingComment: item.mounting,
      components: saved.components.map(component => {
        const dxf = component.dxfIndex === "" || component.dxfIndex == null
          ? null : saved.dxfFiles?.[Number(component.dxfIndex)];
        return {
          partNumber: component.partNumber,
          quantityPerAssembly: component.quantityPerAssembly,
          materialCode: component.materialCode || dxf?.materialCode || "",
          materialGrade: component.materialGrade || "",
          gauge: component.gauge || "",
          cuttingListFinish: component.cuttingListFinish || "",
          dxf: dxf ? { originalFilename: dxf.originalFilename, fixtureTag: dxf.fixtureTag, materialCode: dxf.materialCode || "", sha256: dxf.sha256 || "", consolidationKey: component.cuttingListIdentity || "", outputFilename: dxf.originalFilename } : null
        };
      })
    });
  }
  return fixtures;
}

let cuttingListPreview = [];
function renderCuttingListPreview() {
  const fixtures = collectProjectBomData();
  const groups = new Map();
  const hashFixtureMap = new Map();
  for (const fixture of fixtures) {
    for (const component of fixture.components) {
      const hash = component.dxf?.sha256;
      if (!hash) continue;
      if (!hashFixtureMap.has(hash)) hashFixtureMap.set(hash, new Set());
      hashFixtureMap.get(hash).add(fixture.fixtureTag);
    }
  }
  const commonHashes = new Set([...hashFixtureMap.entries()].filter(([, tags]) => tags.size > 1).map(([hash]) => hash));
  let noDxfCount = 0;
  for (const fixture of fixtures) {
    for (const component of fixture.components) {
      if (!component.dxf) { noDxfCount++; continue; }
      const hashCommon = Boolean(component.dxf.sha256 && commonHashes.has(component.dxf.sha256));
      const isCommon = Boolean(component.dxf.consolidationKey) || String(component.dxf.fixtureTag || "").toUpperCase() === "COMMON" || hashCommon;
      const dxfIdentity = component.dxf.consolidationKey
        ? "approved:" + component.dxf.consolidationKey.toLowerCase()
        : hashCommon ? "sha256:" + component.dxf.sha256 : component.dxf.originalFilename.toLowerCase();
      const materialCode = String(component.materialCode || component.dxf.materialCode || "").toUpperCase();
      const material = component.materialGrade || (materialCode === "C11" || materialCode === "C16" ? "CRS" : "");
      const thickness = component.gauge || (materialCode === "C11" ? "11GA" : materialCode === "C16" ? "16GA" : "");
      const finish = component.cuttingListFinish || fixture.finish || "";
      const key = [dxfIdentity, material.toUpperCase(), thickness.toUpperCase(), String(finish).toUpperCase()].join("|");
      if (!groups.has(key)) groups.set(key, {
        dxfFilename: component.dxf.originalFilename,
        material,
        thickness,
        finish,
        quantity: 0,
        common: isCommon,
        sources: new Set()
      });
      const entry = groups.get(key);
      const qty = Number(component.quantityPerAssembly);
      if (!Number.isFinite(qty) || qty < 0 || component.quantityPerAssembly === "") {
        throw new Error("Invalid quantity for " + component.partNumber + " in " + fixture.fixtureTag);
      }
      entry.quantity += qty * Number(fixture.fixtureQuantity || 0);
      entry.sources.add(fixture.fixtureTag);
      if (!entry.material && component.materialCode) entry.material = component.materialCode;
    }
  }
  cuttingListPreview = [...groups.values()].sort((a,b) =>
    Number(b.common) - Number(a.common) || a.material.localeCompare(b.material) ||
    a.thickness.localeCompare(b.thickness) || a.dxfFilename.localeCompare(b.dxfFilename)
  );
  $("cuttingListRows").innerHTML = cuttingListPreview.length ? cuttingListPreview.map(line => {
    const section = line.common ? "COMMON PARTS" : line.thickness + " CRS";
    return "<tr><td>" + esc(line.dxfFilename) + "</td><td>" + esc(section) + "</td><td>" + esc(line.material || "—") +
      "</td><td>" + esc(line.thickness || "—") + "</td><td>" + esc(line.quantity) +
      "</td><td>" + esc(line.finish || "—") + "</td><td>PC</td><td>" + esc([...line.sources].join(", ")) + "</td></tr>";
  }).join("") : '<tr><td colspan="8" class="empty">No matched DXF components found in the saved fixture BOMs.</td></tr>';
  $("exportCuttingListBtn").disabled = !fixtures.length || cuttingListPreview.length === 0;
  const commonLineCount = cuttingListPreview.filter(line => line.common).length;
  $("cuttingListStatus").textContent = cuttingListPreview.length + " consolidated DXF line(s), including " + commonLineCount + " common line(s), from " +
    fixtures.length + " selected, generated fixture BOM(s). " + noDxfCount + " BOM component(s) without DXF were excluded.";
  $("cuttingListStatus").className = cuttingListPreview.length ? "ok" : "status-text";
}

$("previewCuttingListBtn").addEventListener("click", () => {
  try { renderCuttingListPreview(); }
  catch (error) {
    $("cuttingListStatus").textContent = error.message;
    $("cuttingListStatus").className = "error";
    $("exportCuttingListBtn").disabled = true;
  }
});

$("exportCuttingListBtn").addEventListener("click", async () => {
  const button = $("exportCuttingListBtn");
  button.disabled = true;
  $("cuttingListStatus").textContent = "Preparing the selected fixture BOMs…";
  try {
    const fixtures = collectProjectBomData();
    if (!fixtures.length) throw new Error("Generate at least one fixture BOM and include it in the Project Schedule Summary.");
    renderCuttingListPreview();
    if (!cuttingListPreview.length) throw new Error("No matched DXF components are available for the Laser Order Request.");
    button.disabled = true;
    $("cuttingListStatus").textContent = "Generating Laser Order Request Excel…";
    const response = await fetch("/api/export-cutting-list-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: $("projectName").value,
        customer: $("customer").value,
        storeNumber: $("projectNumber").value,
        poNumber: $("poNumber").value,
        orderNumber: $("laserOrderNumber").value,
        orderDate: $("laserOrderDate").value,
        requestedBy: $("laserRequestedBy").value,
        shipDate: $("laserShipDate").value,
        mountingComment: [...new Set(fixtures.map(fixture => fixture.mountingComment).filter(Boolean))].join(" / "),
        fixtures
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Cutting list export failed.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const disposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);
    anchor.download = filenameMatch ? filenameMatch[1] : "Laser Order Request.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    $("cuttingListStatus").textContent = "Laser Order Request generated. Review material, gauge, finish and quantities before sending to laser cutting.";
    $("cuttingListStatus").className = "ok";
  } catch (error) {
    $("cuttingListStatus").textContent = error.message;
    $("cuttingListStatus").className = "error";
  } finally {
    updateLaserOrderButtonState();
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